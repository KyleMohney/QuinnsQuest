// ==============================
// LEVEL 1: GOBLIN ATTACK
// ==============================

// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. EXPORTS

// ==============================
// 1. LEVEL START LOGIC
// ==============================
function startLevel1() {
    resetLevelState();
    // Clear all pickups and projectiles for a clean level 1 start
    coins = [];
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    currentLevel = 1;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
        playSound("quinn_begin", window.volumeVoices);
        showSubtitle("Look! A fight!", 2200);
    }, 300);
    setTimeout(() => playSound("background1", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }
    enemies = createLevel1Enemies();
    // Prevent spell casters from casting immediately at level start
    for (const enemy of enemies) {
        if (enemy.spriteSet === "big_goblin") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60); // 1-2 seconds delay
        }
    }
    // Stagger spell sound effects for magic casters at level start
    setTimeout(() => {
        let delay = 0;
        for (const enemy of enemies) {
            if (enemy.spriteSet === "big_goblin") {
                setTimeout(() => {
                    if (enemy.casting) playSound("acid", window.volumeSFX);
                }, delay);
                delay += 120 + Math.floor(Math.random() * 80); // 120ms base stagger
            }
        }
    }, 800); // Wait for player voice and music to start

    camera.x = 0;
    camera.y = 0;

    const mapWidth = 5000;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

    trophies = [];
    trophies.push({
        x: levelBounds.right - gateWidth + 30,
        y: GAME_HEIGHT - gateHeight,
        width: gateWidth,
        height: gateHeight,
        type: "gate" // ✅ This triggers town_gate render
    });

    gameState = "playing";
}

// ==============================
// 2. ENEMY SPAWN LIST
// ==============================
window.createLevel1Enemies = function() {
    return [
    // New closer first wave
    window.createGoblin(900),
    window.createGoblin(950),
    window.createGoblin(1000),
    window.createBarricade(1100),
    window.createBigGoblin(1150),
    window.createBigGoblin(1200),

    // Barricade between player and next wave (moved further right)
    window.createBarricade(1400),

    // First Wave (spread out)
    window.createGoblin(1550),
    window.createGoblin(1700),
    window.createGoblin(1850),
    window.createBarricade(2000),
    window.createBigGoblin(2150),
    window.createBigGoblin(2300),

    // Third Wave (moved left)
    window.createGoblin(3000),
    window.createGoblin(3150),
    window.createGoblin(3300),
    window.createBarricade(3500),
    window.createBigGoblin(3700),
    window.createBigGoblin(3900),

    // Fourth Wave (moved left)
    window.createBarricade(4100),
    window.createGoblin(4150),
    window.createGoblin(4250),
    window.createGoblin(4350),
    window.createBigGoblin(4500),
    window.createBigGoblin(4700),
    window.createBigGoblin(4750)
    ];
}

// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel1() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 2; // Transition to Chapter 2
    nextLevelClicked = false;

    // Define button bounds for click detection
    const buttonWidth = 200;
    const buttonHeight = 80;
    // Move button further down and to the right
    const startX = canvas.width - buttonWidth - 40;
    const startY = canvas.height - buttonHeight - 20;
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };
}

// ==============================
// 4. EXPORTS
// ==============================