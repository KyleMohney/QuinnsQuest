// ==============================
// LEVEL 4 - ZOMBIE ONSLAUGHT
// ==============================
// Handles all gameplay logic, rendering, and configuration unique to Level 4.
// Self-contained so engine.js does not require Level-4-specific code.
// ==============================
// WIN CONDITION: Defeat Zombie Lord / Obtain Key


// ==============================
// 1. GLOBALS
// ==============================
let level4Complete = false;


// ==============================
// 2. START / END LOGIC
// ==============================
function startLevel4() {
    currentLevel = 4;
    stopAllSounds();

    playSound("quinn4", volumeVoices);
    setTimeout(() => playSound("background4", volumeMusic), 2000);

    player = createPlayer();
    enemies = createLevel4Enemies();
    hearts = [];
    coins = [];
    projectiles = [];
    particles = [];
    scrolls = [];
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 8000;
    levelBounds = { left: 0, right: mapWidth };

    trophies = []; // No trophy — boss drop triggers win

    gameState = "playing";
}

function endLevel4() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart";
    nextLevelClicked = false;
    level4Complete = true;
}


// ==============================
// 3. DRAW FUNCTIONS
// ==============================
function drawLevel4Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background4;
        if (bg?.naturalWidth && bg?.naturalHeight) {
            ctx.drawImage(bg, 0, 0, bg.naturalWidth, bg.naturalHeight, drawX, 15, bgWidth, bgHeight);
        }

        const road = images.road4;
        if (road?.naturalWidth && road?.naturalHeight) {
            ctx.drawImage(road, 0, 0, road.naturalWidth, road.naturalHeight, drawX, roadY + dy, bgWidth, GROUND_HEIGHT);
        }
    }

    // Darkness overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Light source at Quinn's forehead
    if (player) {
        ctx.globalCompositeOperation = "destination-out";
        const lightX = player.x - camera.x + player.width / 2;
        const lightY = player.y + 30;
        const gradient = ctx.createRadialGradient(lightX, lightY, 20, lightX, lightY, 200);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,1)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(lightX, lightY, 200, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
}


// ==============================
// 4. END SCREEN & CLICK HANDLER
// ==============================
function drawEndScreen4() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("End of Level 4", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    ctx.font = "24px Arial";
    ctx.fillText("Level 5 coming soon!", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

    drawEndScreenButton();
}

// Remove any redeclaration of canvas
// Only assign if not already defined
if (typeof canvas === 'undefined' || !canvas) {
    var canvas = document.getElementById('gameCanvas');
}

const buttonWidth = 200;
const buttonHeight = 80;
const startX = (canvas.width - buttonWidth) / 2;
const startY = canvas.height - buttonHeight - 50;
window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };


// ==============================
// 5. ENEMY SPAWN LIST
// ==============================
function createLevel4Enemies() {
    const list = [];

    const spawnZombieLine = (startX, count, spacing) => {
        for (let i = 0; i < count; i++) {
            list.push(createZombie(startX + i * spacing));
        }
    };

    let xPos = 400;

    // Wave 1
    spawnZombieLine(xPos, 15, 50); xPos += 15 * 50 + 100;
    list.push(createNecromancer(xPos)); xPos += 150;
    list.push(createBarricade(xPos)); xPos += 300;

    // Wave 2
    spawnZombieLine(xPos, 20, 50); xPos += 20 * 50 + 100;
    list.push(createNecromancer(xPos)); xPos += 150;
    list.push(createBarricade(xPos)); xPos += 300;

    // Wave 3
    spawnZombieLine(xPos, 25, 50); xPos += 25 * 50 + 100;
    list.push(createNecromancer(xPos)); xPos += 200;
    list.push(createBarricade(xPos)); xPos += 300;

    // Wave 4
    spawnZombieLine(xPos, 30, 50); xPos += 30 * 50 + 150;
    list.push(createNecromancer(xPos)); xPos += 150;
    list.push(createBarricade(xPos)); xPos += 300;

    // Wave 5
    spawnZombieLine(xPos, 35, 50); xPos += 35 * 50 + 150;
    list.push(createNecromancer(xPos)); xPos += 200;
    list.push(createBarricade(xPos)); xPos += 300;

    // Final Boss
    spawnZombieLine(xPos, 20, 50); xPos += 20 * 50 + 200;
    const boss = createZombieLord(xPos, GAME_HEIGHT - GROUND_HEIGHT - 190);
    boss.onDeath = () => {
        spawnScroll(boss.x, boss.y, "key");
        endLevel4();
    };
    list.push(boss);

    return list;
}
