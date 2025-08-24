// ==============================
// LEVEL 3 - FORTRESS ASSAULT
// ==============================
    
// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. EXPORTS

// ==============================
// 1. START LEVEL LOGIC
// ==============================
function startLevel3() {
    resetLevelState();
    // Clear all pickups, projectiles, and trophies except coins for a clean level 3 start
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    trophies = [];
    currentLevel = 3;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
        playSound("quinn3", window.volumeVoices);
        showSubtitle("I'm coming, Claire!", 2200);
    }, 300);
    setTimeout(() => playSound("background3", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }
    enemies = createLevel3Enemies();
    // Prevent spell casters from casting immediately at level start
    for (const enemy of enemies) {
        if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "necromancer") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60); // 1-2 seconds delay
        }
        if (enemy.spriteSet === "bandit_crossbow") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60);
        }
    }
    // Initial offset before any enemy casting/actions
    setTimeout(() => {
        // Stagger spell sound effects for big_goblin and necromancer at level start
        let delay = 0;
        for (const enemy of enemies) {
            if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "necromancer") {
                setTimeout(() => {
                    if (enemy.casting) playSound(enemy.spriteSet === "big_goblin" ? "acid" : "evil_magic", window.volumeSFX);
                }, delay);
                delay += 120 + Math.floor(Math.random() * 80);
            }
        }
    }, 800); // 800ms offset before any casting/actions
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 6500;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

        trophies = [];
        // Move cave entrance right next to the invisible wall
    const caveWidth = 750; // 50% wider cave entrance
        trophies.push({
            x: levelBounds.right - caveWidth + 40, // Move cave entrance 40px further right
            y: GAME_HEIGHT - gateHeight,
            width: caveWidth,
            height: gateHeight,
            type: "cave"
        });

    gameState = "playing";
}

    // ==============================
    // 2. ENEMY SPAWN LIST
    // ==============================
    function createLevel3Enemies() {
    const list = [];
    // Barricade Line 1 (spread out)
    list.push(createBarricade(850, (GAME_HEIGHT - GROUND_HEIGHT - 15)));
    list.push(createBarricade(1100, (GAME_HEIGHT - GROUND_HEIGHT - 15)));

    // Goblin and Big Goblin Waves (evenly spaced)
    const goblinStart = 1300;
    const goblinEnd = 1800;
    const goblinCount = 5;
    const goblinSpacing = Math.floor((goblinEnd - goblinStart) / (goblinCount - 1));
    for (let i = 0; i < goblinCount; i++) {
        const x = goblinStart + i * goblinSpacing;
        list.push(createGoblin(x));
        if (i % 2 === 1) list.push(createBigGoblin(x + 50));
    }

    // Bandit and Crossbow Bandit Waves (evenly spaced)
    const banditStart = 2000;
    const banditEnd = 3300;
    const banditCount = 8;
    const banditSpacing = Math.floor((banditEnd - banditStart) / (banditCount - 1));
    for (let i = 0; i < banditCount; i++) {
        const x = banditStart + i * banditSpacing;
        list.push(createBandit(x));
        list.push(createBanditCrossbow(x + 100));
        if (i % 2 === 0) list.push(createBarricade(x + 50, (GAME_HEIGHT - GROUND_HEIGHT - 15)));
    }

    // Zombie Wave towards the end (evenly spaced)
    const zombieStart = 3600;
    const zombieEnd = 4000;
    const zombieCount = 5;
    const zombieSpacing = Math.floor((zombieEnd - zombieStart) / (zombieCount - 1));
    for (let i = 0; i < zombieCount; i++) {
        list.push(createZombie(zombieStart + i * zombieSpacing));
    }

    // Final monsters: Two Necromancers before cave entrance (spaced out)
    const necroY = GAME_HEIGHT - GROUND_HEIGHT - 190;
    const necro1 = createNecromancer(5000, necroY);
    const necro2 = createNecromancer(5050, necroY);
    necro1.onDeath = () => {};
    necro2.onDeath = () => {};
    list.push(necro1);
    list.push(necro2);

    return list;
    }

// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel3() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 4; // Transition to Chapter 4
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