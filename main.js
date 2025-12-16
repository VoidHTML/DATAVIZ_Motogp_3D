import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const canvas = document.getElementById('experience-canv');
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const aspect = sizes.width / sizes.height;

const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
    -aspect * frustumSize, 
    aspect * frustumSize, 
    frustumSize, 
    -frustumSize, 
    1, 
    5000
);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

// ===== DONNÉES DATAVIZ =====
let paysData = null;
let crashsData = null;
let constructeursData = null;
let currentChart = null;

// Mapping des objets 3D vers les données JSON
const dataMapping = {
    "Kawasaki": "ducati",    // Kawasaki utilise les données Ducati
    "Honda": "honda",
    "Yamaha": "yamaha",
    "KTM": "ktm",
    "Aprillia": "aprilia",
    "Susuki": "suzuki",
    "Crash": "crashs",
    "podium": "pays"
};

// Images pour chaque constructeur
const images = {
    "ducati": "img/Ducati.png",
    "honda": "img/honda2.png",
    "yamaha": "img/yamaha.png",
    "ktm": "img/KTM.png",
    "aprilia": "img/Aprillia.png",
    "suzuki": "img/suzuki.png",
    "crashs": null,
    "pays": null
};

// Descriptions pour chaque constructeur
const descriptions = {
    "ducati": "Ducati domine le MotoGP moderne avec une progression fulgurante. De 3 victoires en 2015 à 19 en 2024, la marque italienne a révolutionné l'approche technique avec son aérodynamique avancée.",
    "honda": "Honda, géant historique du MotoGP, traverse une période difficile. Après des années de domination avec Marc Márquez, la marque japonaise n'a plus gagné depuis 2022.",
    "yamaha": "Yamaha maintient une présence constante mais peine à rivaliser avec Ducati. La marque aux diapasons cherche à retrouver son niveau de 2021 où elle a remporté 10 victoires.",
    "ktm": "KTM, arrivée en 2017, représente l'ambition autrichienne. Première victoire en 2019, la marque orange progresse mais fait face à des défis économiques.",
    "aprilia": "Aprilia incarne le retour italien. Après des années de reconstruction, les premières victoires sont arrivées en 2022 avec Aleix Espargaró.",
    "suzuki": "Suzuki a quitté le MotoGP fin 2022, un an après avoir été champion du monde avec Joan Mir. Une épopée inachevée qui laisse un goût amer.",
    "crashs": "L'évolution des crashs révèle un paradoxe : malgré les progrès en sécurité, les accidents augmentent. La quête de performance pousse les pilotes aux limites.",
    "pays": "L'Espagne et l'Italie dominent le MotoGP avec 86% des victoires combinées. Cette hégémonie reflète les investissements massifs dans la formation des pilotes."
};

// Charger les données JSON
async function loadData() {
    try {
        const [pays, crashs, constructeurs] = await Promise.all([
            fetch('./data/pays.json').then(r => r.json()),
            fetch('./data/crashs.json').then(r => r.json()),
            fetch('./data/constructeurs.json').then(r => r.json())
        ]);
        paysData = pays;
        crashsData = crashs;
        constructeursData = constructeurs;
        console.log('Données chargées !', { paysData, crashsData, constructeursData });
    } catch (err) {
        console.error('Erreur chargement données:', err);
    }
}

// Initialiser le chargement des données
loadData();

// ===== MODAL =====
const modal = document.querySelector('.modal');
const modalTitle = document.querySelector('.modal-title');
const modalDescription = document.querySelector('.modal-project-description');
const modalStats = document.querySelector('.modal-stats');
const modalChart = document.getElementById('modal-chart');
const modalImage = document.getElementById('modal-image');
const modalExitButton = document.querySelector('.modal-exit-button');

let overlay = null;

function showModal(objectName) {
    const dataKey = dataMapping[objectName];
    if (!dataKey) {
        console.log('Pas de données pour:', objectName);
        return;
    }

    // Créer l'overlay
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', hideModal);

    // Afficher le modal
    modal.classList.remove('hidden');

    // Remplir le contenu selon le type de données
    if (dataKey === 'pays') {
        showPaysData();
    } else if (dataKey === 'crashs') {
        showCrashsData();
    } else {
        showConstructeurData(dataKey);
    }
}

function showPaysData() {
    if (!paysData) return;
    
    modalTitle.textContent = paysData.titre;
    modalDescription.textContent = descriptions.pays;
    
    // Pas d'image pour pays
    modalImage.classList.add('hidden');
    
    // Stats
    const totalVictoires = paysData.victoires.reduce((a, b) => a + b, 0);
    const espItaPercent = Math.round((paysData.victoires[0] + paysData.victoires[1]) / totalVictoires * 100);
    
    modalStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-number">${totalVictoires}</span>
            <span class="stat-label">Total victoires</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${espItaPercent}%</span>
            <span class="stat-label">ESP + ITA</span>
        </div>
    `;
    
    // Graphique
    setTimeout(() => createPaysChart(), 100);
}

function showCrashsData() {
    if (!crashsData) return;
    
    modalTitle.textContent = crashsData.titre;
    modalDescription.textContent = descriptions.crashs;
    
    // Pas d'image pour crashs
    modalImage.classList.add('hidden');
    
    // Stats
    const maxCrashs = Math.max(...crashsData.crashs);
    const minCrashs = Math.min(...crashsData.crashs);
    const evolution = Math.round((maxCrashs - minCrashs) / minCrashs * 100);
    
    modalStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-number">${maxCrashs}</span>
            <span class="stat-label">Pic 2023</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">+${evolution}%</span>
            <span class="stat-label">Évolution</span>
        </div>
    `;
    
    // Graphique
    setTimeout(() => createCrashsChart(), 100);
}

function showConstructeurData(constructeur) {
    if (!constructeursData || !constructeursData[constructeur]) return;
    
    const data = constructeursData[constructeur];
    
    modalTitle.textContent = data.titre;
    modalDescription.textContent = descriptions[constructeur];
    
    // Afficher l'image si disponible
    if (images[constructeur]) {
        modalImage.src = images[constructeur];
        modalImage.alt = data.titre;
        modalImage.classList.remove('hidden');
    } else {
        modalImage.classList.add('hidden');
    }
    
    // Stats
    const totalVictoires = data.victoires.reduce((a, b) => a + b, 0);
    const maxVictoires = Math.max(...data.victoires);
    
    modalStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-number">${totalVictoires}</span>
            <span class="stat-label">Victoires totales</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${maxVictoires}</span>
            <span class="stat-label">Meilleure saison</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${data.pays}</span>
            <span class="stat-label">Pays</span>
        </div>
    `;
    
    // Graphique
    setTimeout(() => createConstructeurChart(constructeur), 100);
}

// ===== GRAPHIQUES ECHARTS =====
function createPaysChart() {
    if (currentChart) {
        currentChart.dispose();
    }
    
    currentChart = echarts.init(modalChart);
    const option = {
        tooltip: { 
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        xAxis: { 
            type: 'category', 
            data: paysData.pays, 
            axisLabel: { color: '#ccc', rotate: 45, fontSize: 11 },
            axisLine: { lineStyle: { color: '#666' } }
        },
        yAxis: { 
            type: 'value', 
            axisLabel: { color: '#ccc' },
            axisLine: { lineStyle: { color: '#666' } },
            splitLine: { lineStyle: { color: '#333' } }
        },
        series: [{ 
            data: paysData.victoires, 
            type: 'bar', 
            itemStyle: { color: '#ff6600', borderRadius: [5, 5, 0, 0] },
            label: { show: true, position: 'top', color: '#ff6600' }
        }],
        backgroundColor: 'transparent',
        grid: { left: '10%', right: '10%', bottom: '25%', top: '10%' }
    };
    currentChart.setOption(option);
}

function createCrashsChart() {
    if (currentChart) {
        currentChart.dispose();
    }
    
    currentChart = echarts.init(modalChart);
    const option = {
        tooltip: { 
            trigger: 'axis',
            formatter: '{b}<br/>Crashs: {c}'
        },
        xAxis: { 
            type: 'category', 
            data: crashsData.annees, 
            axisLabel: { color: '#ccc', fontSize: 11 },
            axisLine: { lineStyle: { color: '#666' } }
        },
        yAxis: { 
            type: 'value', 
            axisLabel: { color: '#ccc' },
            axisLine: { lineStyle: { color: '#666' } },
            splitLine: { lineStyle: { color: '#333' } }
        },
        series: [{
            data: crashsData.crashs,
            type: 'line',
            smooth: true,
            lineStyle: { color: '#ff6600', width: 3 },
            areaStyle: { 
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(255,102,0,0.5)' },
                        { offset: 1, color: 'rgba(255,102,0,0.1)' }
                    ]
                }
            },
            itemStyle: { color: '#ff6600' },
            symbol: 'circle',
            symbolSize: 8
        }],
        backgroundColor: 'transparent',
        grid: { left: '10%', right: '10%', bottom: '15%', top: '10%' }
    };
    currentChart.setOption(option);
}

function createConstructeurChart(constructeur) {
    if (currentChart) {
        currentChart.dispose();
    }
    
    const data = constructeursData[constructeur];
    
    currentChart = echarts.init(modalChart);
    const option = {
        tooltip: { 
            trigger: 'axis',
            formatter: '{b}<br/>Victoires: {c}'
        },
        xAxis: { 
            type: 'category', 
            data: data.annees, 
            axisLabel: { color: '#ccc', fontSize: 11 },
            axisLine: { lineStyle: { color: '#666' } }
        },
        yAxis: { 
            type: 'value', 
            axisLabel: { color: '#ccc' },
            axisLine: { lineStyle: { color: '#666' } },
            splitLine: { lineStyle: { color: '#333' } }
        },
        series: [{
            data: data.victoires,
            type: 'bar',
            itemStyle: { color: data.couleur, borderRadius: [5, 5, 0, 0] },
            label: { show: true, position: 'top', color: data.couleur }
        }],
        backgroundColor: 'transparent',
        grid: { left: '10%', right: '10%', bottom: '15%', top: '10%' }
    };
    currentChart.setOption(option);
}

function hideModal() {
    modal.classList.add('hidden');
    
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    
    if (currentChart) {
        currentChart.dispose();
        currentChart = null;
    }
}

modalExitButton.addEventListener('click', hideModal);

// Fermer avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        hideModal();
    }
});

// ===== ÉCRAN DE SÉLECTION =====
const selectionScreen = document.querySelector('.selection-screen');
const motoCards = document.querySelectorAll('.moto-card');
let selectedPlayer = null;
let player1 = null;
let player2 = null;
let player3 = null;

motoCards.forEach(card => {
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerName = card.dataset.player;
        console.log('Carte cliquée:', playerName);
        selectMoto(playerName);
    });
});

function selectMoto(playerName) {
    // Vérifier que les players sont chargés
    if (!player1 || !player2) {
        console.log('Players pas encore chargés, attente...');
        setTimeout(() => selectMoto(playerName), 100);
        return;
    }
    
    selectedPlayer = playerName;
    
    // Cacher l'écran de sélection
    selectionScreen.classList.add('hidden');
    
    // Cacher tous les players
    player1.visible = false;
    player2.visible = false;
    if (player3) player3.visible = false;

    // Activer celui sélectionné
    if (playerName === 'player') {
        moto = player1;
        player1.visible = true;
    } else if (playerName === 'player2') {
        moto = player2;
        player2.visible = true;
    } else if (playerName === 'player3' && player3) {
        moto = player3;
        player3.visible = true;
    }
        
    // Initialiser la direction
    direction = moto.rotation.y - Math.PI * 0.5;
    console.log('Moto sélectionnée:', playerName);
}

// ===== OBJETS INTERACTIFS =====
const intersectObjectsNames = [
    "Aprillia",
    "Honda",
    "Susuki",
    "Yamaha",
    "KTM",
    "Kawasaki", 
    "Crash", 
    "podium", 
];
const intersectObjects = [];
let intersectObject = "";

// ===== CONTRÔLE DE MOTO =====
let moto = null;
let direction = 0;

const cameraOffset = new THREE.Vector3(337.61, 108.36, 76.54);

const motoSettings = {
    speed: 0,
    maxSpeed: 0.5,
    acceleration: 0.01,
    rotationSpeed: 0.03
};

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false
};

document.addEventListener('keydown', (e) => {
    // Ne pas bouger si le modal est ouvert
    if (!modal.classList.contains('hidden')) return;
    
    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.right = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.left = true;
            break;
        case 'Space':
            keys.brake = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.right = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.left = false;
            break;
        case 'Space':
            keys.brake = false;
            break;
    }
});

function updateMoto() {
    if (!moto) return;

    if (keys.forward) {
        motoSettings.speed = Math.min(motoSettings.speed + motoSettings.acceleration, motoSettings.maxSpeed);
    } else if (keys.backward) {
        motoSettings.speed = Math.max(motoSettings.speed - motoSettings.acceleration, -motoSettings.maxSpeed / 2);
    } else {
        motoSettings.speed *= 0.95;
        if (Math.abs(motoSettings.speed) < 0.0001) motoSettings.speed = 0;
    }

    if (keys.brake) motoSettings.speed *= 0.85;

    if (keys.left) direction -= motoSettings.rotationSpeed;
    if (keys.right) direction += motoSettings.rotationSpeed;

    moto.position.x -= Math.sin(direction) * motoSettings.speed;
    moto.position.z -= Math.cos(direction) * motoSettings.speed;

    moto.rotation.y = direction + Math.PI * 0.5;
}

function updateCamera() {
    if (!moto) return;
    camera.position.x = moto.position.x + cameraOffset.x;
    camera.position.y = moto.position.y + cameraOffset.y;
    camera.position.z = moto.position.z + cameraOffset.z;
    camera.lookAt(moto.position);
}

// ===== CHARGEMENT DU MODÈLE =====
const loader = new GLTFLoader();

loader.load('./DATAVIZ_tFinalducatiplayer.glb', function (glb) {
    glb.scene.traverse(child => {
        if (intersectObjectsNames.includes(child.name)) {
            intersectObjects.push(child);
            console.log('Objet interactif trouvé:', child.name);
        }
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Récupérer les deux players
    player1 = glb.scene.getObjectByName('player');
    player2 = glb.scene.getObjectByName('player2');
    player3 = glb.scene.getObjectByName('player3');
    
    if (player1) {
        console.log('Player 1 trouvé !', player1);
        player1.visible = false; // Caché jusqu'à la sélection
    }
    
    if (player2) {
        console.log('Player 2 trouvé !', player2);
        player2.visible = false; // Caché jusqu'à la sélection
    }

    if (player3) {
        console.log('Player 3 trouvé !', player3);
        player3.visible = false; // Caché jusqu'à la sélection
    }

    scene.add(glb.scene);
    
    // Modèle chargé, afficher l'écran de sélection
    console.log('GLB chargé ! Prêt à jouer.');
    selectionScreen.classList.add('loaded');

}, undefined, function (error) {
    console.error(error);
});

// ===== LUMIÈRES =====
const sun = new THREE.DirectionalLight(0xFFFFFF);
sun.position.set(75, 50, 50);
sun.castShadow = true;
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 0.2;
scene.add(sun);

const color = 0xFFFFFF;
const intensity = 3;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

camera.position.set(335.13, 125.06, 47.41);

// ===== ÉVÉNEMENTS =====
function onResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    const aspect = sizes.width / sizes.height;
    camera.left = -aspect * frustumSize;
    camera.right = aspect * frustumSize;
    camera.top = frustumSize;
    camera.bottom = -frustumSize;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
    if (intersectObject !== "") {
        showModal(intersectObject);
    }
}

window.addEventListener("resize", onResize);
window.addEventListener("click", onClick);
window.addEventListener("pointermove", onPointerMove);

// ===== BOUCLE D'ANIMATION =====
function animate() {
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(intersectObjects, true);

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        // Récupérer le nom de l'objet ou de son parent
        let obj = intersects[0].object;
        intersectObject = obj.name;
        
        // Si le nom n'est pas dans la liste, chercher le parent
        if (!intersectObjectsNames.includes(intersectObject) && obj.parent) {
            intersectObject = obj.parent.name;
        }
    } else {
        document.body.style.cursor = 'default';
        intersectObject = "";
    }

    updateMoto();
    updateCamera();

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

console.log('🏍️ MotoGP DataViz 3D initialisé !');