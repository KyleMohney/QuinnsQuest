// ==============================
// LEVEL 2 - VILLAGE RAID
// ==============================
// Handles all gameplay logic, rendering, and configuration unique to Level 2.
// Self-contained so engine.js does not require Level-2-specific code.
// ==============================


// ==============================
// 1. GLOBALS
// ==============================
let level2Complete = false;


// ==============================
// 2. START / END LOGIC
// ==============================
function startLevel2() {
    currentLevel = 2;

    stopAllSounds();
    playSound("quinn1", volumeVoices);
    setTimeout(() => playSound("background2", volumeMusic), 2000);

    player = createPlayer();
    enemies = createLevel2Enemies();
    hearts = [];
    coins = [];
    projectiles = [];
    particles = [];
    scrolls = [];
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 4800;
    levelBounds = { left: 0, right: mapWidth };

    trophies = []; // No trophy — win is triggered by boss drop

    const buttonWidth = 200;
    const buttonHeight = 80;
    const startX = (canvas.width - buttonWidth) / 2;
    const startY = canvas.height - buttonHeight - 50;
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };

    gameState = "playing";
}

function endLevel2() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart";
    nextLevelClicked = false;
    level2Complete = true;
}


// ==============================
// 3. DRAW FUNCTIONS
// ==============================
function drawLevel2Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background2;
        if (bg?.naturalWidth && bg?.naturalHeight) {
            ctx.drawImage(bg, 0, 0, bg.naturalWidth, bg.naturalHeight, drawX, 0, bgWidth, bgHeight);
        }

        const road = images.road2;
        if (road?.naturalWidth && road?.naturalHeight) {
            ctx.drawImage(road, 0, 0, road.naturalWidth, road.naturalHeight, drawX, roadY + dy, bgWidth, GROUND_HEIGHT);
        }
    }
}


// ==============================
// 4. END SCREEN & CLICK HANDLER
// ==============================
function drawEndScreen2() {
    if (images.end_screen2) {
        ctx.drawImage(images.end_screen2, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawEndScreenButton();
}

function handleLevel2EndClick(x, y) {
    const bounds = window.nextLevelButtonBounds;
    if (
        bounds &&
        x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height
    ) {
        if (!nextLevelClicked) {
            nextLevelClicked = true;
            playSound("click", volumeSFX);
            setTimeout(() => {
                startLevel3();
            }, 300);
        }
    }
}


// ==============================
// 5. ENEMY SPAWN LIST
// ==============================
function createLevel2Enemies() {
    const list = [];

    // Barricade Line 1
    list.push(createBarricade(850));
    list.push(createBarricade(1000));

    // Ranged Defense
    list.push(createBanditCrossbow(900));
    list.push(createBanditCrossbow(1100));

    // Enemy Waves
    list.push(createBarricade(1150));
    list.push(createBandit(1400));
    list.push(createBanditCrossbow(1600));
    list.push(createBandit(1800));
    list.push(createBanditCrossbow(2000));
    list.push(createBandit(2200));
    list.push(createBarricade(2250));
    list.push(createBarricade(2350));
    list.push(createBanditCrossbow(2400));
    list.push(createBanditCrossbow(2450));
    list.push(createBandit(2600));
    list.push(createBanditCrossbow(2800));
    list.push(createBandit(3000));
    list.push(createBanditCrossbow(3200));
    list.push(createBandit(3400));
    list.push(createBanditCrossbow(3600));

    // Final Defense
    list.push(createBarricade(3900));
    list.push(createBanditCrossbow(4000));
    list.push(createBanditCrossbow(4050));
    list.push(createBarricade(4400));
    list.push(createBandit(4500));
    list.push(createBandit(4550));
    list.push(createBandit(4560));
    list.push(createBandit(4570));

    // Final Boss: Bandit Leader
    const boss = createBanditLeader(4600, GAME_HEIGHT - GROUND_HEIGHT - 190);
    boss.onDeath = () => {
        spawnScroll(boss.x, boss.y, "key");
        endLevel2();
    };
    list.push(boss);

    return list;
}
