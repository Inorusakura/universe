//保存每个星球的数据，方便在后面调用
const planetData = {
    mercury: {
        name: "水星",
        imageUrl: "images/mercury.jpg",
        distance: "57.9 × 10⁶ km",
        diameter: "4,880 km",
        mass: "3.30 × 10²³ kg",
        desc: "最靠近太阳的行星，表面昼夜温差超过600℃"
    },
    venus: {
        name: "金星",
        imageUrl: "images/venus.jpg",
        distance: "108 × 10⁶ km",
        diameter: "12,104 km",
        mass: "4.87 × 10²⁴ kg",
        desc: "大气层厚密，表面气压是地球的92倍"
    },
    earth: {
        name: "地球",
        imageUrl: "images/earth.jpg",
        distance: "149.6 × 10⁶ km",
        diameter: "12,742 km",
        mass: "5.97 × 10²⁴ kg",
        desc: "目前已知唯一存在生命的行星"
    },
    mars: {
        name: "火星",
        imageUrl: "images/mars.jpg",
        distance: "227.9 × 10⁶ km",
        diameter: "6,779 km",
        mass: "6.42 × 10²³ kg",
        desc: "红色行星，拥有太阳系最大的火山"
    },
    jupiter: {
        name: "木星",
        imageUrl: "images/jupiter.jpg",
        distance: "778.3 × 10⁶ km",
        diameter: "139,820 km",
        mass: "1.90 × 10²⁷ kg",
        desc: "气态巨行星，拥有强大的磁场和79颗卫星"
    },
    saturn: {
        name: "土星",
        imageUrl: "images/saturn.jpg",
        distance: "1,427 × 10⁶ km",
        diameter: "116,460 km",
        mass: "5.68 × 10²⁶ kg",
        desc: "拥有美丽的光环系统，密度比水还低"
    },
    uranus: {
        name: "天王星",
        imageUrl: "images/uranus.jpg",
        distance: "2,871 × 10⁶ km",
        diameter: "50,724 km",
        mass: "8.68 × 10²⁵ kg",
        desc: "冰巨星，自转轴倾斜角度达到98度"
    },
    neptune: {
        name: "海王星",
        imageUrl: "images/neptune.jpg",
        distance: "4,498 × 10⁶ km",
        diameter: "49,244 km",
        mass: "1.02 × 10²⁶ kg",
        desc: "表面风速可达2100km/h，太阳系最寒冷区域之一"
    }
};

const infoPanel = document.getElementById('planet-info');
let currentPlanet = null;

document.querySelectorAll('.planet').forEach(planet => {
    planet.addEventListener('click', function(e) {
        e.stopPropagation();
        const planetType = this.dataset.planet;
        
        if (currentPlanet === planetType) {
            closeInfo();
        } else {
            currentPlanet = planetType;
            showInfo(planetType, e);
        }
    });
});

// 在文档加载完成后调用
document.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    
    // 图片加载完成时添加class
    document.querySelectorAll('.planet-image img').forEach(img => {
        img.onload = () => img.classList.add('loaded');
    });
});

document.addEventListener('click', closeInfo);

function showInfo(planetType, e) {
    const data = planetData[planetType];
    const rect = e.target.getBoundingClientRect();
    
    // 定位面板在点击位置附近
    let posX = e.clientX + 20;
    let posY = e.clientY - 150;

    infoPanel.style.left = `${posX}px`;
    infoPanel.style.top = `${posY}px`;
    
    infoPanel.innerHTML = `
        <h3>${data.name}</h3>
        <div class="planet-image">
            <img src="${data.imageUrl}" alt="${data.name}" 
                 onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='">
        </div>
        <div class="info-row">
            <span>轨道半径:</span>
            <span>${data.distance}</span>
        </div>
        <div class="info-row">
            <span>直径:</span>
            <span>${data.diameter}</span>
        </div>
        <div class="info-row">
            <span>质量:</span>
            <span>${data.mass}</span>
        </div>
        <p class="desc">${data.desc}</p>
    `;
    
    infoPanel.classList.add('visible');
    document.querySelector(`[data-planet="${planetType}"]`).classList.add('highlight');
}

function closeInfo() {
    infoPanel.classList.remove('visible');
    document.querySelectorAll('.planet').forEach(p => p.classList.remove('highlight'));
    currentPlanet = null;
}