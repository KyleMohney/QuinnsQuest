// ==============================
// LEVEL 5 - LONG ROAD
// ==============================

// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. EXPORTS

// ==============================
// 1. START LEVEL LOGIC
// ==============================
function startLevel5() {
    resetLevelState();
    // Clear all pickups, projectiles, and trophies except coins for a clean level 5 start
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    trophies = [];
    currentLevel = 5;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
        console.log("[Level 5] Triggering Quinn sound and subtitle");
        playSound("quinn5", window.volumeVoices);
        showSubtitle("I have to get down this scary road.", 2200);
    }, 300); // Match delay with other levels
    setTimeout(() => playSound("background5", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }
    enemies = createLevel5Enemies();
    // Prevent spell casters from casting immediately at level start
    for (const enemy of enemies) {
        if (enemy.spriteSet === "bandit_crossbow" || enemy.spriteSet === "big_goblin") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60); // 1-2 seconds delay
        }
    }
    // Stagger spell sound effects for big_goblin only
    setTimeout(() => {
        let delay = 0;
        for (const enemy of enemies) {
            if (enemy.spriteSet === "big_goblin") {
                setTimeout(() => {
                    if (enemy.casting) playSound("acid", window.volumeSFX);
                }, delay);
                delay += 120 + Math.floor(Math.random() * 80);
            }
        }
    }, 800);
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 7500; // Updated to 7500 for level 5
    levelBounds = { left: 0, right: mapWidth };

    // Add Town Gates Two as the victory trophy for level 5
    const gateWidth = 600;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;
    trophies = [];
    trophies.push({
        x: levelBounds.right - gateWidth + 30,
        y: GAME_HEIGHT - gateHeight,
        width: gateWidth,
        height: gateHeight,
        type: "gate2" // Use a new type for towngates2
    });

    gameState = "playing";
}

// ==============================
// 2. ENEMY SPAWN LIST
// ==============================
function createLevel5Enemies() {
    const list = [];
    // Barricade Line 1 (spread out)
    list.push(createBarricade(900, (GAME_HEIGHT - GROUND_HEIGHT - 100)));
    list.push(createBarricade(1300, (GAME_HEIGHT - GROUND_HEIGHT - 100)));

    // Goblin Waves (evenly spaced, first half)
    const goblinStart = 1500;
    const goblinEnd = 3500;
    const goblinCount = 8;
    const goblinSpacing = Math.floor((goblinEnd - goblinStart) / (goblinCount - 1));
    for (let i = 0; i < goblinCount; i++) {
        list.push(createGoblin(goblinStart + i * goblinSpacing));
        if (i % 3 === 0) list.push(createBarricade(goblinStart + i * goblinSpacing + 50, (GAME_HEIGHT - GROUND_HEIGHT - 100)));
    }

    // Bandit and Crossbow Bandit Waves (evenly spaced, second half)
    const banditStart = 4000;
    const banditEnd = 7000;
    const banditCount = 8;
    const banditSpacing = Math.floor((banditEnd - banditStart) / (banditCount - 1));
    for (let i = 0; i < banditCount; i++) {
        const x = banditStart + i * banditSpacing;
        list.push(createBandit(x));
        list.push(createBanditCrossbow(x + 80));
        if (i % 2 === 0) list.push(createBarricade(x + 40, (GAME_HEIGHT - GROUND_HEIGHT - 100)));
    }

    return list;
}

// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel5() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 6; // Transition to Chapter 6
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
