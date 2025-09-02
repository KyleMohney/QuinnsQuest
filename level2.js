// ==============================
// LEVEL 2 - VILLAGE RAID
// ==============================

// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. EXPORTS

// ==============================
// 1.START LEVEL LOGIC
// ==============================
function startLevel2() {
    resetLevelState();
    // Clear all pickups and projectiles except coins for a clean level 2 start
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    trophies = [];
    currentLevel = 2;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
        playSound("quinn1", window.volumeVoices);
        showSubtitle("I'll get you, criminal!", 2200);
    }, 300);
    setTimeout(() => playSound("background2", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }

    enemies = createLevel2Enemies();
    for (const enemy of enemies) {
        if (enemy.spriteSet === "bandit_crossbow") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60);
        }
    }

    camera.x = 0;
    camera.y = 0;

    const mapWidth = 6000;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

    gameState = "playing";
}


// ==============================
// 2. ENEMY SPAWN LIST
// ==============================
function createLevel2Enemies() {
    const list = [];
    // Barricade Line 1 (spread out)
    list.push(createBarricade(850, (GAME_HEIGHT - GROUND_HEIGHT - 15)));
    list.push(createBarricade(1100, (GAME_HEIGHT - GROUND_HEIGHT - 15)));

    // Ranged Defense
    list.push(createBanditCrossbow(950));

    // Enemy Waves (evenly spaced)
    const waveStart = 1400;
    const waveEnd = 5400;
    const waveCount = 8;
    const waveSpacing = Math.floor((waveEnd - waveStart) / (waveCount - 1));
    for (let i = 0; i < waveCount; i++) {
        const x = waveStart + i * waveSpacing;
        list.push(createBandit(x, getRandomRoadY(72)));
        list.push(createBanditCrossbow(x + 200, getRandomRoadY(72)));
        if (i % 2 === 0) list.push(createBarricade(x + 100, (GAME_HEIGHT - GROUND_HEIGHT - 15)));
    }

    // Final Defense
    // Move final defense and boss group to the left
        // Removed final barricade at 5500
    list.push(createBanditCrossbow(5600));
    list.push(createBandit(5700));

    // Final Boss: Bandit Leader
    const boss = createBanditLeader(5750, GAME_HEIGHT - GROUND_HEIGHT - 190);
    boss.onDeath = () => {
        spawnScroll(boss.x, boss.y);
        endLevel2();
    };
    list.push(boss);

    return list;
}

// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel2() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 3; // Transition to Chapter 3
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