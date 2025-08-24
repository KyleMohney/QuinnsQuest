// ==============================
// LEVEL 4 - ZOMBIE ONSLAUGHT
// ==============================

// TABLE OF CONTENTS
// 1. START LEVEL LOGIC
// 2. ENEMY SPAWN LIST
// 3. END LEVEL LOGIC
// 4. DROPS
// 5. EXPORTS

// ==============================
// 1. START LEVEL LOGIC
// ==============================
let mapWidth = 7000; // Make mapWidth global for drops and enemies
function startLevel4() {
    resetLevelState();
    // Clear all pickups, projectiles, and trophies except coins for a clean level 4 start
    hearts = [];
    scrolls = [];
    keys = [];
    projectiles = [];
    particles = [];
    trophies = [];
    currentLevel = 4;
    bossIntroTriggered = false;
    stopAllSounds();
    setTimeout(() => {
        playSound("quinn4", window.volumeVoices);
        showSubtitle("I'll use my magic light.", 2200);
    }, 300);
    setTimeout(() => playSound("background4", window.volumeMusic), 2000);

    if (typeof window.resetPlayer === 'function') {
        window.resetPlayer();
    }
    enemies = createLevel4Enemies();
    // Prevent spell casters from casting immediately at level start
    for (const enemy of enemies) {
        if (enemy.spriteSet === "necromancer" || enemy.spriteSet === "zombie_lord") {
            enemy.castCooldown = 60 + Math.floor(Math.random() * 60); // 1-2 seconds delay
        }
    }
    // Initial offset before any enemy casting/actions
    setTimeout(() => {
        // Stagger spell sound effects for necromancer and zombie lord at level start
        let delay = 0;
        for (const enemy of enemies) {
            if (enemy.spriteSet === "necromancer" || enemy.spriteSet === "zombie_lord") {
                setTimeout(() => {
                    if (enemy.casting) playSound("evil_magic", window.volumeSFX);
                }, delay);
                delay += 120 + Math.floor(Math.random() * 80);
            }
        }
    }, 800); // Wait for player voice and music to start

    camera.x = 0;
    camera.y = 0;

    levelBounds = { left: 0, right: mapWidth };

    gameState = "playing";
}

// ==============================
// ENEMY SPAWN LIST
// ==============================
function createLevel4Enemies() {
    const list = [];
    // Barricade Line 1 (spread out)
    list.push(createBarricade(600, (GAME_HEIGHT - GROUND_HEIGHT - 100)));
    list.push(createBarricade(900, (GAME_HEIGHT - GROUND_HEIGHT - 100)));

    // Zombie Waves (evenly spaced)
    const zombieStart = 1000;
    const zombieEnd = 6000;
    const zombieCount = 12;
    const zombieSpacing = Math.floor((zombieEnd - zombieStart) / (zombieCount - 1));
    for (let i = 0; i < zombieCount; i++) {
        list.push(createZombie(zombieStart + i * zombieSpacing));
        if (i % 3 === 0) list.push(createBarricade(zombieStart + i * zombieSpacing + 50, (GAME_HEIGHT - GROUND_HEIGHT - 100)));
    }

    // Necromancer Waves (evenly spaced)
    const necroY = GAME_HEIGHT - GROUND_HEIGHT - 190 - 60;
    const necroStart = 2000;
    const necroEnd = 5500;
    const necroCount = 7;
    const necroSpacing = Math.floor((necroEnd - necroStart) / (necroCount - 1));
    for (let i = 0; i < necroCount; i++) {
        list.push(createNecromancer(necroStart + i * necroSpacing, necroY));
    }

    // Final Boss: Zombie Lord and guards
    const bossGroupX = mapWidth - 700;
    const boss = createZombieLord(bossGroupX, necroY);
    boss.onDeath = () => {
        spawnKey(boss.x, boss.y);
        endLevel4();
    };
    // Place two necromancers as guards, spaced out from boss
    list.push(createNecromancer(bossGroupX - 120, necroY));
    list.push(createNecromancer(bossGroupX + 120, necroY));
    list.push(boss);

    return list;
}

// ==============================
// 3. END LEVEL LOGIC
// ==============================
function endLevel4() {
    stopAllSounds();
    playSound("win", window.volumeMusic);
    gameState = "levelstart";
    currentLevel = 5; // Transition to Chapter 5
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
// 4. DROPS
// ==============================
function addLevel4HeartDrops() {
    const heartY = GAME_HEIGHT - GROUND_HEIGHT - 80;
    hearts.push({
        x: Math.floor(mapWidth * 0.25),
        y: heartY,
        width: 48,
        height: 48,
        type: "heart",
        spawnFrame: 0,
        collected: false
    });
    hearts.push({
        x: Math.floor(mapWidth * 0.75),
        y: heartY,
        width: 48,
        height: 48,
        type: "heart",
        spawnFrame: 0,
        collected: false
    });
}
    
// ==============================
// 5. EXPORTS
// ==============================
if (typeof window !== "undefined") {
    window.addLevel4HeartDrops = addLevel4HeartDrops;
}