// ==============================
// LEVEL 6 - BANDIT HIDEOUT
// ==============================

// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. EXPORTS

// ==============================
// 1. START LEVEL LOGIC
// ==============================
function startLevel6() {
    resetLevelState();
    // Clear all pickups and projectiles for a clean level 6 start
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    trophies = [];
    currentLevel = 6;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
    playSound("quinn6", window.volumeVoices);
    showSubtitle("This is where the bandits are hiding.", 2200);
    setTimeout(() => playSound("bandit_lord_cackle", window.volumeSFX), 2200); // Play boss laugh after dialog
    // Only play Bandit Lord's laughter once at the beginning. Further laughter handled in entity.js when he comes into view.
    }, 300);
    setTimeout(() => playSound("background6", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }
    enemies = window.createLevel6Enemies();
    // Prevent spell casters from casting immediately at level start
    for (const enemy of enemies) {
        if (["big_goblin","necromancer","zombie_lord","bandit_lord","hound"].includes(enemy.spriteSet)) {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60); // 1-2 seconds delay
        }
    }
    // Stagger spell sound effects for magic casters at level start
    setTimeout(() => {
        let delay = 0;
        for (const enemy of enemies) {
            if (["big_goblin","necromancer","zombie_lord"].includes(enemy.spriteSet)) {
                setTimeout(() => {
                    if (enemy.casting) playSound(enemy.spriteSet === "big_goblin" ? "acid" : "evil_magic", window.volumeSFX);
                }, delay);
                delay += 120 + Math.floor(Math.random() * 80);
            }
        }
    }, 800);

    camera.x = 0;
    camera.y = 0;

    const mapWidth = 8000;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

    // No trophy gate for level 6, but spawn Claire pickup at far right
    // PATCH: Do not spawn Claire until Bandit Lord is defeated

    gameState = "playing";
}

// ==============================
// 2. ENEMY SPAWN LIST
// ==============================
window.createLevel6Enemies = function() {
    const mapWidth = 8000;
    const groundY = GAME_HEIGHT - GROUND_HEIGHT - 120;
    const enemyTypes = [
        { fn: createGoblin, y: groundY },
        { fn: createBigGoblin, y: groundY },
        { fn: createBandit, y: groundY },
        { fn: createBanditCrossbow, y: groundY },
        { fn: createZombie, y: groundY },
        { fn: createNecromancer, y: groundY - 70 }
    ];
    const startX = 900;
    const endX = mapWidth - 400;
    const countPerType = 8;
    const spacing = Math.floor((endX - startX) / (enemyTypes.length * countPerType - 1));
    let enemies = [];
    let x = startX;
    for (let i = 0; i < countPerType; i++) {
        for (const type of enemyTypes) {
            // Exception: do not randomize Bandit Lord Y
            if (type.fn === createBanditLord) {
                enemies.push(type.fn(x, type.y));
            } else {
                enemies.push(type.fn(x, getRandomRoadY(72)));
            }
            x += spacing;
        }
        // Add barricades every 2 cycles
        if (i % 2 === 1) {
            enemies.push(createBarricade(x, GAME_HEIGHT - GROUND_HEIGHT - 100));
            x += spacing;
        }
    }
    // Hound mini-boss at 2/3 of the map, but not past right edge
    const houndX = Math.min(Math.floor(mapWidth * 0.66), mapWidth - 220);
    enemies.push(createHound(houndX, groundY - 10));
    // Bandit Lord boss at far right, but not past right edge
    const banditLordWidth = 384;
    const margin = 32;
    const bossX = mapWidth - banditLordWidth - margin; // Ensure fully within map
    // Calculate Y so feet are flush with road
    const roadY = GAME_HEIGHT - GROUND_HEIGHT + 20; // Road height includes extra 20px
    const bossY = roadY - 330; // Boss height
    enemies.push(createBanditLord(bossX, bossY));
    return enemies;
}
// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel6() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 7; // Transition to Chapter 7
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
