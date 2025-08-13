// ==============================
// LEVEL 1: GOBLIN ATTACK
// ==============================
// Handles all gameplay logic, rendering, and configuration unique to Level 1.
// Self-contained so engine.js does not require Level-1-specific code.
// ==============================


// ==============================
// 1. GLOBALS
// ==============================
let level1Complete = false;


// ==============================
// 2. START / END LOGIC
// ==============================
function startLevel1() {
    currentLevel = 1;
    coinCount = 0;

    stopAllSounds();
    playSound("quinn_begin", volumeVoices);
    setTimeout(() => playSound("background1", volumeMusic), 2000);

    player = createPlayer();
    enemies = createLevel1Enemies();
    hearts = [];
    coins = [];
    projectiles = [];
    particles = [];
    scrolls = [];
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 3000;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;
    trophies = [
        {
            x: levelBounds.right - gateWidth + 30,
            y: 0,
            width: gateWidth,
            height: gateHeight,
            type: "gate"
        }
    ];

    const buttonWidth = 200;
    const buttonHeight = 80;
    const startX = (canvas.width - buttonWidth) / 2;
    const startY = canvas.height - buttonHeight - 50;
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };

    gameState = "playing";
}

function endLevel1() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart";
    nextLevelClicked = false;
}


// ==============================
// 3. DRAW FUNCTIONS
// ==============================
function drawLevel1Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background1;
        if (bg?.naturalWidth && bg?.naturalHeight) {
            ctx.drawImage(bg, 0, 0, bg.naturalWidth, bg.naturalHeight, drawX, 0, bgWidth, bgHeight);
        }

        const road = images.road1;
        if (road?.naturalWidth && road?.naturalHeight) {
            ctx.drawImage(road, 0, 0, road.naturalWidth, road.naturalHeight, drawX, roadY + dy, bgWidth, GROUND_HEIGHT);
        }
    }
}


// ==============================
// 4. END SCREEN & CLICK HANDLER
// ==============================
function drawEndScreen1() {
    if (images.end_screen1) {
        ctx.drawImage(images.end_screen1, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawEndScreenButton();
}

function handleLevel1EndClick(x, y) {
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
                startLevel2();
            }, 300);
        }
    }
}


// ==============================
// 5. ENEMY SPAWN LIST
// ==============================
function createLevel1Enemies() {
    return [
        // Opening
        createGoblin(500),
        createGoblin(550),
        createBarricade(600),
        createBigGoblin(650),
        createGoblin(700),

        // Early cluster
        createGoblin(900),
        createGoblin(950),
        createBarricade(1000),
        createBigGoblin(1050),
        createGoblin(1100),
        createGoblin(1150),

        // Midfield
        createGoblin(1400),
        createGoblin(1450),
        createBarricade(1500),
        createBigGoblin(1550),
        createGoblin(1600),
        createGoblin(1625),
        createGoblin(1650),

        // Pre-final
        createGoblin(1900),
        createGoblin(1925),
        createBarricade(1950),
        createBigGoblin(2000),
        createGoblin(2050),
        createGoblin(2075),
        createGoblin(2100),

        // Gate defense
        createGoblin(2300),
        createGoblin(2325),
        createBarricade(2350),
        createBigGoblin(2400),
        createGoblin(2425),
        createGoblin(2450),
        createGoblin(2475),
        createGoblin(2500)
    ];
}
