const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// 获取设备像素比
const devicePixelRatio = window.devicePixelRatio || 1;
// 设置Canvas物理分辨率
canvas.width = 1600 * devicePixelRatio;
canvas.height = 900 * devicePixelRatio;
// 保持CSS显示分辨率
canvas.style.width = '1600px';
canvas.style.height = '900px';
// 坐标系缩放校准
ctx.scale(devicePixelRatio, devicePixelRatio);


let currentLane = 1;  // 当前轨道
let fuel = 100;  // 燃料
let score = 0;  // 分数
let speed = 3;  // 速度
const MAX_SPEED = 15;  // 速度上限
let gameOver = true;  // 游戏状态
let lastSpawnTime = 0;  // 最后生成的时间
const lanesY = [225, 450, 675];  // 轨道Y坐标
const laneStates = [[], [], []];  // 三条轨道的数据
let soundEnabled = true;  // 声音是否开启
let fuelMissCount = 0;  // 连续未生成燃料的次数
let lastFuelTime = 0;  // 最后捡到燃料的时间

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

// 创建飞船图像
function createShipImage() {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHBhdGggZmlsbD0iIzQyODJGNiIgZD0iTTIwIDBMNDAgMjAgMjAgNDAgMCAyMHoiLz48L3N2Zz4=';
    return img;
}

// 初始化所有游戏状态
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
    // 开始游戏循环
    gameLoop();
}

function gameLoop() {
    // 检测游戏状态
    if (gameOver) {
        showGameOver();
        return;
    }
    // 更新游戏状态
    update();
    draw(); // 重新绘制画面
    requestAnimationFrame(gameLoop); // 游戏循环
}
// 燃料生成考虑因素
function calculateFuelProbability() {
    const BASE_PROB = 0.4; // 基础生成概率
    const SPEED_FACTOR = Math.max(0, (10 - speed) * 0.05); //速度越低概率越高
    const FUEL_FACTOR = (fuel < 30) ? 0.2 : 0; //燃料小于30时概率加0.2
    const MISS_FACTOR = Math.min(0.3, fuelMissCount * 0.1); //没有生成燃料就加0.1概率，最多0.3
    //返回总值为燃料生成概率
    return BASE_PROB + SPEED_FACTOR + FUEL_FACTOR + MISS_FACTOR;
}

function update() {
    const now = Date.now(); // 读取当前时间
    const SAFE_DISTANCE = 600; // 设置燃料安全距离
    
    // 每600ms进行一次生成，速度越快生成越快
    if (now - lastSpawnTime > 600 - speed * 20) {
        lastSpawnTime = now; // 最后一次生成时间
        
        // 在最多两条轨道生成陨石，避免没有躲的地方
        const activeAsteroidLanes = laneStates.map(lanes => 
            lanes.some(o => o.type === 'asteroid')  // 检查该轨道是否有陨石
        );
        let availableLanes = [0, 1, 2].filter(l => !activeAsteroidLanes[l]); // 有几条可用轨道
        
        if (availableLanes.length > 1) availableLanes.pop(); // 可用轨道大于1则生成

        availableLanes.forEach(lane => {
            if (Math.random() < 0.7) { // 70概率生成陨石
                const lastObj = laneStates[lane][laneStates[lane].length - 1]; // 上个陨石的位置
                if (!lastObj || (1600 - lastObj.x) > 350) { // 距离上个陨石350像素则生成陨石
                    laneStates[lane].push({
                        type: 'asteroid',
                        x: 1600,
                        width: 45,
                        height: 45
                    });
                }
            }
        });

        // 智能生成燃料
        const safeFuelLanes = [0, 1, 2].filter(lane => {
            if (laneStates[lane].some(o => o.type === 'asteroid')) return false;  // 排除有陨石的轨道
            const lastFuel = laneStates[lane].filter(o => o.type === 'fuel').pop();
            if (lastFuel && (1600 - lastFuel.x) < SAFE_DISTANCE * 1.5) return false;  // 最近燃料间距小于900像素则不生成
            return true;
        });

        let shouldGenerateFuel = false;
        //距离最后一次捡到燃料的时间
        const timeSinceLastFuel = now - lastFuelTime;
        
        // 燃料小于20，连续三次以上未生成燃料，距离最后一次捡到燃料的时间大于8秒，都会强制生成燃料，保证不会因未生成燃料失败
        if (fuel < 20 || fuelMissCount >= 3 || timeSinceLastFuel > 8000) {
            shouldGenerateFuel = true;
        } 
        // 概率生成燃料
        else if (safeFuelLanes.length > 0 && Math.random() < calculateFuelProbability()) {
            shouldGenerateFuel = true;
        }

        if (shouldGenerateFuel && safeFuelLanes.length > 0) {
            const lane = safeFuelLanes[Math.floor(Math.random() * safeFuelLanes.length)]; // 随机生成
            const fuelValue = speed < 10 ? 45 : 35; // 速度小于10补充35燃料，否则45
            
            laneStates[lane].push({
                type: 'fuel',
                x: 1600,
                width: 30,
                height: 30,
                value: fuelValue
            });
            // 重置数据
            lastFuelTime = now;
            fuelMissCount = 0;
        } else {
            fuelMissCount++; // 增加连续未生成数
        }
    }

    // 更新所有物体位置
    for (let lane = 0; lane < 3; lane++) {
        laneStates[lane] = laneStates[lane].filter(obj => {
            obj.x -= speed; // 所有物体以相同速度往左移动
            
            if (lane === currentLane && isColliding(obj)) {
                handleCollision(obj);
                return false; // 移除碰到的物体
            }
            
            return obj.x > -100; // 超出屏幕左边就移除
        });
    }

    // 减少燃料
    fuel = Math.max(0, fuel - 0.06);
    // 增加速度
    if (speed < MAX_SPEED) {
        speed += 0.001;
    }
    // 增加分数
    score += Math.floor(speed);
    
    // 实时更新界面数值信息
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = speed.toFixed(1);
    document.getElementById('fuelFill').style.width = fuel + '%';
    
    // 如果燃料小于30，显示燃料警告，否则关闭
    if (fuel < 30) {
        document.getElementById('lowFuelWarning').style.display = 'block';
    } else {
        document.getElementById('lowFuelWarning').style.display = 'none';
    }
    // 燃料耗尽游戏失败
    if (fuel <= 0) gameOver = true;
}
// 检测是否碰到物体
function isColliding(obj) {
    return (
        obj.x < ship.x + ship.width && 
        obj.x + obj.width > ship.x
    );
}

// 碰到的是陨石就失败，碰到的是燃料就增加燃料
function handleCollision(obj) {
    if (obj.type === 'asteroid') {
        gameOver = true;
    } else {
        fuel = Math.min(100, fuel + obj.value);
    }
}

function draw() {
    ctx.clearRect(0, 0, 1600, 900); // 清空画布
    // drawStarfield();
    
    // 绘制轨道线
    lanesY.forEach(y => {
        ctx.beginPath();
        ctx.setLineDash([30, 20]);  // 虚线30实线20空白
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 3;  // 线宽
        ctx.moveTo(0, y);  // 起点
        ctx.lineTo(1600, y);  // 终点
        ctx.stroke();  // 描边
    });

    // 绘制所有物体
    laneStates.forEach((objs, lane) => {
        const y = lanesY[lane];
        objs.forEach(obj => {
            if (obj.type === 'asteroid') {
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(obj.x + 22.5, y + 22.5, 22.5, 0, Math.PI*2);  // 转换为圆心坐标
                ctx.fill();
                // 光晕
                ctx.beginPath();
                ctx.arc(obj.x + 22.5, y + 22.5, 30, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(136, 136, 136, 0.3)';
                ctx.fill();
            } else {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(obj.x, y + 7.5, 30, 15);
                // 光晕
                ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.fillRect(obj.x - 7.5, y, 45, 30);
            }
        });
    });

    // 绘制飞船
    ctx.save();
    ctx.beginPath();
    ctx.arc(ship.x + 30, lanesY[currentLane] + 30, 37.5, 0, Math.PI*2);  // 光晕
    ctx.fillStyle = 'rgba(0, 130, 255, 0.2)';
    ctx.fill();
    
    ctx.drawImage(ship.img, ship.x, lanesY[currentLane], ship.width, ship.height);
    ctx.restore();
}

// 展示游戏结束界面
function showGameOver() {
    document.getElementById('startScreen').style.display = 'flex';  // 设置可见
    const startScreen = document.getElementById('startScreen');
    
    const gameOverInfo = document.createElement('div');
    gameOverInfo.className = 'game-over';
    gameOverInfo.textContent = `游戏结束! 最终得分: ${score}`;
    // 清理旧分数
    const oldInfo = startScreen.querySelector('.game-over');
    if (oldInfo) startScreen.removeChild(oldInfo);
    // 放入新分数
    const button = document.getElementById('startButton');
    startScreen.insertBefore(gameOverInfo, button);
    //停止音乐
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

// 操控上下和空格开始
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
// 点击开始游戏
document.getElementById('startButton').addEventListener('click', initGame);

// 初始绘制
draw();

// 音乐开关
document.getElementById('soundControl').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundControl').textContent = soundEnabled ? '🔊 音乐' : '🔇 静音';
    if (soundEnabled && !gameOver) {
        bgMusic.play().catch(e => console.log("音乐播放被阻止:", e));
    } else {
        bgMusic.pause();
    }
});

// 音乐自动播放
document.addEventListener('click', () => {
    document.getElementById('audioLoading').style.display = 'block';
    if (soundEnabled) {
        bgMusic.volume = 0.3;
        bgMusic.play().catch(e => console.log("自动播放被阻止:", e));
    }
}, { once: true });


// function drawStarfield() {
//     ctx.fillStyle = 'white';
//     for (let i = 0; i < 300; i++) {
//         const x = Math.random() * 1600;
//         const y = Math.random() * 900;
//         const size = Math.random() * 2;
//         ctx.fillRect(x, y, size, size);
//     }
    
//     if (Math.random() < 0.01) {
//         const x = Math.random() * 1600;
//         const y = Math.random() * 900;
//         const length = 75 + Math.random() * 75;
        
//         ctx.beginPath();
//         ctx.moveTo(x, y);
//         ctx.lineTo(x + length, y - length);
//         ctx.lineWidth = 1.5;
//         ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
//         ctx.stroke();
//     }
// }