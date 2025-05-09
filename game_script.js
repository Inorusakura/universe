// 高分辨率设置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = 1600 * devicePixelRatio;
canvas.height = 900 * devicePixelRatio;
canvas.style.width = '1600px';
canvas.style.height = '900px';
ctx.scale(devicePixelRatio, devicePixelRatio);

// 游戏状态
let currentLane = 1;
let fuel = 100;
let score = 0;
let speed = 3;
const MAX_SPEED = 15;
let gameOver = true;
let lastSpawnTime = 0;
const lanesY = [225, 450, 675];
const laneStates = [[], [], []];
let soundEnabled = true;
let audioLoaded = false;
let fuelMissCount = 0;
let lastFuelTime = 0;

// 飞船属性
const ship = {
    x: 150,
    y: lanesY[1],
    width: 60,
    height: 60,
    img: createShipImage()
};

// 音频元素
const bgMusic = document.getElementById('bgMusic');
// const fuelSound = document.getElementById('fuelSound');
// const crashSound = document.getElementById('crashSound');

function createShipImage() {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHBhdGggZmlsbD0iIzQyODJGNiIgZD0iTTIwIDBMNDAgMjAgMjAgNDAgMCAyMHoiLz48L3N2Zz4=';
    return img;
}

function initGame() {
    currentLane = 1;
    fuel = 100;
    score = 0;
    speed = 3;
    gameOver = false;
    laneStates.forEach(l => l.length = 0);
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('fuelFill').style.width = '100%';
    document.getElementById('score').textContent = '0';
    document.getElementById('speed').textContent = speed.toFixed(1);
    document.getElementById('lowFuelWarning').style.display = 'none';
    lastSpawnTime = Date.now();
    fuelMissCount = 0;
    lastFuelTime = Date.now();
    
    // 开始背景音乐
    if (soundEnabled) {
        bgMusic.volume = 0.3;
        bgMusic.play().catch(e => console.log("自动播放被阻止:", e));
    }
    
    gameLoop();
}

function gameLoop() {
    if (gameOver) {
        showGameOver();
        return;
    }
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function calculateFuelProbability() {
    const BASE_PROB = 0.4;
    const SPEED_FACTOR = Math.max(0, (10 - speed) * 0.05);
    const FUEL_FACTOR = (fuel < 30) ? 0.2 : 0;
    const MISS_FACTOR = Math.min(0.3, fuelMissCount * 0.1);
    
    return BASE_PROB + SPEED_FACTOR + FUEL_FACTOR + MISS_FACTOR;
}

function update() {
    const now = Date.now();
    const SAFE_DISTANCE = 600;
    
    // 生成系统 - 每600ms检查一次
    if (now - lastSpawnTime > 600 - speed * 20) {
        lastSpawnTime = now;
        
        // 1. 生成陨石（最多两条轨道）
        const activeAsteroidLanes = laneStates.map(lanes => 
            lanes.some(o => o.type === 'asteroid')
        );
        let availableLanes = [0, 1, 2].filter(l => !activeAsteroidLanes[l]);
        
        if (availableLanes.length > 1) availableLanes.pop();

        availableLanes.forEach(lane => {
            if (Math.random() < 0.7) {
                const lastObj = laneStates[lane][laneStates[lane].length - 1];
                if (!lastObj || (1600 - lastObj.x) > 350) {
                    laneStates[lane].push({
                        type: 'asteroid',
                        x: 1600,
                        width: 45,
                        height: 45
                    });
                }
            }
        });

        // 2. 智能燃料生成
        const safeFuelLanes = [0, 1, 2].filter(lane => {
            if (laneStates[lane].some(o => o.type === 'asteroid')) return false;
            const lastFuel = laneStates[lane].filter(o => o.type === 'fuel').pop();
            if (lastFuel && (1600 - lastFuel.x) < SAFE_DISTANCE * 1.5) return false;
            return true;
        });

        // 动态生成决策
        let shouldGenerateFuel = false;
        const timeSinceLastFuel = now - lastFuelTime;
        
        // 强制生成条件
        if (fuel < 20 || fuelMissCount >= 3 || timeSinceLastFuel > 8000) {
            shouldGenerateFuel = true;
        } 
        // 概率生成
        else if (safeFuelLanes.length > 0 && Math.random() < calculateFuelProbability()) {
            shouldGenerateFuel = true;
        }

        if (shouldGenerateFuel && safeFuelLanes.length > 0) {
            const lane = safeFuelLanes[Math.floor(Math.random() * safeFuelLanes.length)];
            const fuelValue = speed < 10 ? 45 : 35;
            
            laneStates[lane].push({
                type: 'fuel',
                x: 1600,
                width: 30,
                height: 30,
                value: fuelValue
            });
            
            lastFuelTime = now;
            fuelMissCount = 0;
        } else {
            fuelMissCount++;
        }
    }

    // 更新所有物体位置
    for (let lane = 0; lane < 3; lane++) {
        laneStates[lane] = laneStates[lane].filter(obj => {
            obj.x -= speed;
            
            if (lane === currentLane && isColliding(obj)) {
                handleCollision(obj);
                return false;
            }
            
            return obj.x > -100;
        });
    }

    // 更新游戏状态
    fuel = Math.max(0, fuel - 0.06);
    if (speed < MAX_SPEED) {
        speed += 0.001;
    }
    score += Math.floor(speed);
    
    // 更新UI
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = speed.toFixed(1);
    document.getElementById('fuelFill').style.width = fuel + '%';
    
    // 低燃料警告
    if (fuel < 30) {
        document.getElementById('lowFuelWarning').style.display = 'block';
    } else {
        document.getElementById('lowFuelWarning').style.display = 'none';
    }
    
    if (fuel <= 0) gameOver = true;
}

function isColliding(obj) {
    return (
        obj.x < ship.x + ship.width && 
        obj.x + obj.width > ship.x
    );
}

function handleCollision(obj) {
    if (obj.type === 'asteroid') {
        if (soundEnabled && audioLoaded) {
            crashSound.currentTime = 0;
            crashSound.play().catch(e => console.log('音效播放失败:', e));
        }
        gameOver = true;
    } else {
        if (soundEnabled && audioLoaded) {
            fuelSound.currentTime = 0;
            fuelSound.play().catch(e => console.log('音效播放失败:', e));
        }
        fuel = Math.min(100, fuel + obj.value);
    }
}

function draw() {
    ctx.clearRect(0, 0, 1600, 900);
    drawStarfield();
    
    // 绘制轨道线
    lanesY.forEach(y => {
        ctx.beginPath();
        ctx.setLineDash([30, 20]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.moveTo(0, y);
        ctx.lineTo(1600, y);
        ctx.stroke();
    });

    // 绘制所有物体
    laneStates.forEach((objs, lane) => {
        const y = lanesY[lane];
        objs.forEach(obj => {
            if (obj.type === 'asteroid') {
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(obj.x + 22.5, y + 22.5, 22.5, 0, Math.PI*2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(obj.x + 22.5, y + 22.5, 30, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(136, 136, 136, 0.3)';
                ctx.fill();
            } else {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(obj.x, y + 7.5, 30, 15);
                
                ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.fillRect(obj.x - 7.5, y, 45, 30);
            }
        });
    });

    // 绘制飞船
    ctx.save();
    ctx.beginPath();
    ctx.arc(ship.x + 30, lanesY[currentLane] + 30, 37.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0, 130, 255, 0.2)';
    ctx.fill();
    
    ctx.drawImage(ship.img, ship.x, lanesY[currentLane], ship.width, ship.height);
    ctx.restore();
}

function drawStarfield() {
    ctx.fillStyle = 'white';
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * 1600;
        const y = Math.random() * 900;
        const size = Math.random() * 2;
        ctx.fillRect(x, y, size, size);
    }
    
    if (Math.random() < 0.01) {
        const x = Math.random() * 1600;
        const y = Math.random() * 900;
        const length = 75 + Math.random() * 75;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y - length);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.stroke();
    }
}

function showGameOver() {
    document.getElementById('startScreen').style.display = 'flex';
    const startScreen = document.getElementById('startScreen');
    
    const gameOverInfo = document.createElement('div');
    gameOverInfo.className = 'game-over';
    gameOverInfo.textContent = `游戏结束! 最终得分: ${score}`;
    
    const oldInfo = startScreen.querySelector('.game-over');
    if (oldInfo) startScreen.removeChild(oldInfo);
    
    const button = document.getElementById('startButton');
    startScreen.insertBefore(gameOverInfo, button);
    
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

// 事件监听
document.addEventListener('keydown', e => {
    if (gameOver) {
        if (e.code === 'Space') initGame();
    } else {
        if (['ArrowUp', 'KeyW'].includes(e.code) && currentLane > 0) {
            currentLane--;
        } else if (['ArrowDown', 'KeyS'].includes(e.code) && currentLane < 2) {
            currentLane++;
        }
    }
});

document.getElementById('startButton').addEventListener('click', initGame);

document.getElementById('soundControl').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundControl').textContent = soundEnabled ? '🔊 音效' : '🔇 静音';
    if (soundEnabled && !gameOver) {
        bgMusic.play().catch(e => console.log("音乐播放被阻止:", e));
    } else {
        bgMusic.pause();
    }
});

// 初始绘制
draw();

// 处理音频自动播放
document.addEventListener('click', () => {
    document.getElementById('audioLoading').style.display = 'block';
    if (soundEnabled) {
        bgMusic.volume = 0.3;
        bgMusic.play().catch(e => console.log("自动播放被阻止:", e));
    }
}, { once: true });