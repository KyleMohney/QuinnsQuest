// ==============================
// QUINN'S QUEST ENGINE
// TABLE OF CONTENTS
// ==============================
// 1. Constants & Globals
// 2. Game State & Level Loop
// 3. Input Handling
// 4. Player Logic
// 5. Enemy Logic
// 6. Projectile & Combat Logic
// 7. Level Backgrounds & Boundaries
// 8. Drawing Systems
// 9. Game Screens & Start Logic
// 10. Game Entities

// ==============================
// 1. CONSTANTS & GLOBALS
// ==============================

// === Priority Rules ===
let activeSounds = [];

// === Canvas Setup ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Game Dimensions ===
let GAME_WIDTH = window.innerWidth;
let GAME_HEIGHT = window.innerHeight;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// === Global Constants ===
const GRAVITY = 1;
const FRICTION = 0.9;
const GROUND_HEIGHT = 65;
const PLAYER_Y_OFFSET = 40;

// === Input Flags ===
let muted = false;
let invincible = false;

// === Game State ===
let gameState = "title";
let lastGameState = "title";
let currentLevel = 3;
let nextLevelTransitionTimer = 0;
let bossIntroTriggered = false;
let bossCutsceneActive = false;
let coinCount = 0;
let retryClicked = false;
let retryTimer = 0;
let startClicked = false;
let titleMusicPlayed = false;
let nextLevelClicked = false;

// === Music Handle ===
let currentMusic = null; // ✅ tracks currently playing background music

// === Audio Settings ===
let volumeMusic = 0.7;   // Controls background music volume
let volumeSFX = 1.0;     // Controls sound effects volume (e.g. pickups, slash)
let volumeVoices = 1.0;  // Controls voice/voiceover volume (e.g. Quinn, Leader)

// === Object Collections ===
let images = {};
let sounds = {};
let keys = {};
let player = null;
let enemies = [];
let projectiles = [];
let particles = [];
let coins = [];
let hearts = [];
let trophies = [];
let scrolls = [];
let levelBounds = { left: 0, right: 5000 };

// === Camera & Frame Counter ===
let camera = { x: 0, y: 0 };
let frame = 0;
let shakeTimer = 0;
let cameraShakeAmount = 0;

// === Time Delta Support ===
let lastTime = 0;
let deltaTime = 0;

function getCameraShakeOffset() {
    if (camera.shakeTimer > 0) {
        const dx = Math.random() * 10 - 5;
        const dy = Math.random() * 10 - 5;
        return { dx, dy };
    }
    return { dx: 0, dy: 0 };
}

// === Canvas Resizing ===
function resizeCanvas() {
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}

// === Load all sprites & sounds before starting game ===
function loadAssets() {
    fetch("assets_map.json")
        .then(res => res.json())
        .then(map => {
            let loaded = 0;
            const total = Object.keys(map.sprites).length + Object.keys(map.sounds).length;

            // === Load Sprites ===
            for (const key in map.sprites) {
                const img = new Image();
                img.onload = () => {
                    if (++loaded === total) startGame();
                };
                img.onerror = () => {
                    if (++loaded === total) startGame();
                };
                img.src = map.sprites[key];
                images[key] = img;
            }

            // === Load Sounds ===
            for (const key in map.sounds) {
                const audio = new Audio(map.sounds[key]);
                audio.oncanplaythrough = () => {
                    if (++loaded === total) startGame();
                };
                audio.onerror = () => {
                    if (++loaded === total) startGame();
                };
                sounds[key] = audio;
            }
        });
}

// INIT
function init() {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // === Start Screen Click Handler ===
    canvas.addEventListener("click", evt => {
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        // === TITLE SCREEN BUTTON LOGIC ===
        if (gameState === "title") {
            const buttonWidth = 200;
            const buttonHeight = 80;
            const startButtonX = (canvas.width - buttonWidth) / 2;
            const startButtonY = canvas.height - buttonHeight - 20;

            const withinButton =
                x >= startButtonX && x <= startButtonX + buttonWidth &&
                y >= startButtonY && y <= startButtonY + buttonHeight;

            if (withinButton) {
                if (!startClicked) {
                    startClicked = true;
                } else {
                    playSound("click", volumeSFX);
                    setTimeout(() => {
                        startLevel1();
                    }, 150);
                }
            }
        }

        // === GAME OVER SCREEN LOGIC ===
        else if (gameState === "gameover") {
            const bounds = window.nextLevelButtonBounds;
            if (
                bounds &&
                x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height
            ) {
                if (!retryClicked) {
                    retryClicked = true;
                    playSound("click", volumeSFX);
                    setTimeout(() => {
                        if (currentMusic) {
                            currentMusic.pause();
                            currentMusic.currentTime = 0;
                            currentMusic = null;
                        }
                        stopAllSounds();

                        if (currentLevel === 1) startLevel1();
                        else if (currentLevel === 2) startLevel2();
                        else if (currentLevel === 3) startLevel3();

                        retryClicked = false;
                    }, 300);
                }
            }
        }

        // === LEVEL START SCREEN CLICK LOGIC ===
        else if (gameState === "levelstart") {
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
                        if (currentLevel === 1) {
                            startLevel2();
                        } else if (currentLevel === 2) {
                            startLevel3();
                        } else if (currentLevel === 3) {
                            startLevel4(); // future expansion
                        }
                    }, 300);
                }
            }
        }
    }); // ✅ closes canvas.addEventListener("click", ...)

    // === Keyboard Listeners ===
    window.addEventListener("keydown", e => {
        keys[e.key] = true;
    });

    window.addEventListener("keyup", e => {
        keys[e.key] = false;
    });

    loadAssets();
}

// Ensure init runs when the page loads
window.onload = init;


// ==============================
// 2. GAME STATE & LEVEL LOOP
// ==============================

// "title"        – Title screen (main menu, waits for player to start)
// "playing"      – Active gameplay; updates player, enemies, projectiles, etc.
// "levelstart"          – End-of-level results screen before next stage
// "gameover"     – Player death screen (retry or quit options)
// "gamecomplete" – Final completion/victory screen after last level
// "paused"       – Pause menu overlay (blurred background)
// "settings"     – Settings menu overlay (blurred background)


function startGame() {
    stopAllSounds();
    playSound("title", volumeMusic);
    gameState = "title";
    resizeCanvas();
    requestAnimationFrame(gameLoop);
}

    //START LEVEL LOGIC
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
            type: "gate" // 🧠 default type (can omit if not needed elsewhere)
        }
    ];

    gameState = "playing";
}

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

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

    gameState = "playing";
}

function startLevel3() {
    currentLevel = 3;
    stopAllSounds();
    playSound("quinn3", volumeVoices);
    setTimeout(() => playSound("background3", volumeMusic), 2000);

    player = createPlayer();
    enemies = createLevel3Enemies();
    hearts = [];
    coins = [];
    projectiles = [];
    particles = [];
    scrolls = [];
    camera.x = 0;
    camera.y = 0;

    const mapWidth = 4000;
    levelBounds = { left: 0, right: mapWidth };

    const gateWidth = 400;
    const gateHeight = GAME_HEIGHT - GROUND_HEIGHT;

    trophies = [
        {
            x: levelBounds.right - gateWidth + 30,
            y: 0,
            width: gateWidth,
            height: gateHeight,
            type: "cave" // ✅ This triggers cave_entrance render
        }
    ];

    gameState = "playing";
}

    //END LEVEL LOGIC
function endLevel1() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart"; 
    nextLevelClicked = false;

    // Define button bounds for click detection
    const buttonWidth = 200;
    const buttonHeight = 80;
    const startX = (canvas.width - buttonWidth) / 2;
    const startY = canvas.height - buttonHeight - 50;
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };
}

function endLevel2() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart";
    nextLevelClicked = false; // ✅ Fix
}

function endLevel3() {
    stopAllSounds();
    playSound("win", volumeMusic);
    gameState = "levelstart";
    nextLevelClicked = false; // ✅ Fix
}

function restartGame() {
    stopAllSounds();
    retryClicked = false;
    titleMusicPlayed = false;
    if (currentLevel === 1) startLevel1();
    else if (currentLevel === 2) startLevel2();
    else if (currentLevel === 3) startLevel3();
}

function playSound(name, volume = 1.0) {
    if (!muted && sounds[name]) {
        try {
            const sound = sounds[name].cloneNode();
            sound.volume = volume;

            // Track for stopping later
            activeSounds.push(sound);
            sound.onended = () => {
                activeSounds = activeSounds.filter(s => s !== sound);
            };

            if (["title", "background1", "background2", "background3", "win"].includes(name)) {
                if (currentMusic) {
                    currentMusic.pause();
                    currentMusic.currentTime = 0;
                }
                currentMusic = sound;
            }

            sound.play();
        } catch (e) {}
    }
}


function stopAllSounds() {
    for (const s of activeSounds) {
        try {
            s.pause();
            s.currentTime = 0;
        } catch (e) {}
    }
    activeSounds = [];

    if (currentMusic) {
        try {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        } catch (e) {
            // Silently fail
        }
        currentMusic = null;
    }
}


function applyCameraShake() {
    if (shakeTimer > 0) {
        camera.x += Math.random() * 10 - 5;
        camera.y += Math.random() * 6 - 3;
        shakeTimer--;
    } else {
        camera.y = 0;
    }
}

function gameLoop(timestamp = 0) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    const dt = deltaTime / 16.67;

    // === Auto-stop background music when not playing ===
    if (
        ["title", "end", "gameover", "gamecomplete", "paused", "settings"].includes(gameState) &&
        currentMusic &&
        (currentMusic.src.includes("background1") || currentMusic.src.includes("background2") || currentMusic.src.includes("background3"))
    ) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
    }

    // === Resume background music when returning from pause/settings
    if (
        gameState === "playing" &&
        (lastGameState === "paused" || lastGameState === "settings") &&
        !currentMusic
    ) {
        const music =
            currentLevel === 1 ? "background1" :
            currentLevel === 2 ? "background2" :
            currentLevel === 3 ? "background3" : null;

        if (music) {
            playSound(music, volumeMusic);
        }
    }

// === Handle delayed transition to Level 2
if (gameState === "end" && currentLevel === 1 && nextLevelTransitionTimer > 0) {
    if (frame >= nextLevelTransitionTimer) {
        playSound("click", volumeSFX);
        nextLevelTransitionTimer = 0;
        startLevel2();
        return;
    }
}

    // === Handle delayed transition to Level 3
if (gameState === "end" && currentLevel === 2 && nextLevelTransitionTimer > 0) {
    if (frame >= nextLevelTransitionTimer) {
        playSound("click", volumeSFX);
        nextLevelTransitionTimer = 0;
        startLevel3();
        return;
    }
}

    // === Core game updates
    if (gameState === "playing") {
        updatePlayer(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        updateGlow();
        updateParticles(dt);
    }

    applyCameraShake();
    draw();

    lastGameState = gameState;
    frame++;
    requestAnimationFrame(gameLoop);
}


// ==============================
// 3. INPUT HANDLING
// ==============================

document.addEventListener("keydown", e => {
    keys[e.key] = true;

    switch (e.key) {
        case "m":
            muted = !muted;
            break;

        case "i":
            if (player) player.invincible = !player.invincible;
            break;

        case "p":
            if (["playing", "paused"].includes(gameState)) {
                gameState = gameState === "playing" ? "paused" : "playing";
            }
            break;

        case "r":
            if (gameState === "gameover") {
                restartGame();
            }
            break;

        case "Escape":
            if (["playing", "settings"].includes(gameState)) {
                gameState = gameState === "playing" ? "settings" : "playing";
            }
            break;
    } // ✅ Correctly closes the switch here
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
});


// ==============================
// 4. PLAYER LOGIC
// ==============================
const JUMP_FORCE = -20;

function createPlayer(x = 100) {
    return {
        x,
        y: GAME_HEIGHT - GROUND_HEIGHT - 64 + PLAYER_Y_OFFSET,
        width: 128,
        height: 128,
        vx: 0,
        vy: 0,
        health: 10,
        maxHealth: 10,
        isBlocking: false,
        facing: "right",
        isJumping: false,
        onGround: true,
        invincibilityTimer: 0,
        attackCooldown: 0,
        attackTimer: 0,
        blockSoundTimer: 0,
        magicCooldown: 0,
        castingMagic: false,
        dead: false,
        hitFlash: 0,
        glow: null,
        glowTimer: 0,
        damage: 1,
        isAttacking: false,
        castFrame: null
    };
}

function updatePlayer(dt) {
    if (bossCutsceneActive || !player || player.dead) return;

    // === Timers: Block Sound
    if (player.blockSoundTimer > 0) player.blockSoundTimer--;

    // === Movement Control ===
    if (player.isBlocking || player.castingMagic || player.attackTimer > 0) {
        if (!player.hitFlash && player.glow !== "red") player.vx = 0;
    } else {
        if (keys["ArrowLeft"]) {
            player.vx = -8;
            player.facing = "left";
        } else if (keys["ArrowRight"]) {
            player.vx = 8;
            player.facing = "right";
        } else {
            player.vx = 0;
        }
    }

    // === Apply knockback from projectiles ===
    if (player.knockbackX) {
        player.x += player.knockbackX * dt;
        player.knockbackX *= 0.8; // decay
        if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0;
    }

    // === Jumping
    if (keys[" "] && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        playSound("jump", volumeSFX);
    }

    // === Blocking
    player.isBlocking = keys["ArrowUp"];

    // === Melee Attack
    if (keys["ArrowDown"] && player.attackCooldown <= 0 && !player.isBlocking) {
        performMeleeAttack();
    }

    // === Cast Magic
    if (keys["Shift"] && !player.castingMagic && player.magicCooldown <= 0 && !player.isBlocking) {
        player.castingMagic = true;
        player.castFrame = frame + 60;
    }

    // === Apply physics
    player.vy += GRAVITY * dt;
    player.x += player.vx;
    player.y += player.vy * dt;

    // === Camera follow
    const gateStop = levelBounds.right - GAME_WIDTH + 32;
    camera.x = Math.max(0, Math.min(player.x - GAME_WIDTH / 2, gateStop));

    // === Stay inside world bounds
    if (player.x < levelBounds.left) player.x = levelBounds.left;
    if (player.x + player.width > levelBounds.right)
        player.x = levelBounds.right - player.width;

    // === Ground collision
    const wasOnGround = player.onGround;
    if (player.y + player.height >= GAME_HEIGHT - GROUND_HEIGHT) {
        player.y = GAME_HEIGHT - GROUND_HEIGHT - player.height;
        player.vy = 0;
        player.onGround = true;
        if (!wasOnGround) {
            spawnParticles("block", player.x + player.width / 2, player.y + player.height - 10);
        }
    }

    // === Barricade collision with soft overlap allowance
    const barricades = enemies.filter(e => e.spriteSet === "barricade" && !e.dead);
    for (let b of barricades) {
        const overlapX = player.x + player.width - b.x;
        const overlapXReverse = b.x + b.width - player.x;
        const softMargin = 40;

        if (checkCollision(player, b)) {
            const comingFromLeft = player.x + player.width <= b.x + b.width / 2;
            const comingFromRight = player.x >= b.x + b.width / 2;

            if (player.vx > 0 && comingFromLeft && overlapX > softMargin) {
                player.x = b.x - player.width + softMargin;
                player.vx = 0;
            } else if (player.vx < 0 && comingFromRight && overlapXReverse > softMargin) {
                player.x = b.x + b.width - softMargin;
                player.vx = 0;
            }
        }
    }

    // === Timers
    player.magicCooldown = Math.max(0, player.magicCooldown - 1);

    if (player.castFrame && frame >= player.castFrame) {
        if (!player.dead && !bossCutsceneActive) {
            castFireball();
            player.magicCooldown = 260;
        }
        player.castFrame = null;
        player.castingMagic = false;
    }
    player.attackCooldown = Math.max(0, player.attackCooldown - 1);
    player.invincibilityTimer = Math.max(0, player.invincibilityTimer - 1);
    player.hitFlash = Math.max(0, player.hitFlash - 1);

    if (player.attackTimer > 0) player.attackTimer--;
    else player.isAttacking = false;

    // === Heart pickups
    for (let i = hearts.length - 1; i >= 0; i--) {
        if (checkCollision(player, hearts[i])) {
            if (player.health < player.maxHealth) {
                player.health++;
                playSound("pickup", volumeSFX);
                hearts.splice(i, 1);
                continue;
            }
        }
    }

    // === Coin pickups
    for (let i = coins.length - 1; i >= 0; i--) {
        if (checkCollision(player, coins[i])) {
            coinCount++;
            playSound("coin", volumeSFX * 0.3);
            coins.splice(i, 1);
            continue;
        }
    }
    coins = coins.filter(c => --c.life > 0);
    hearts = hearts.filter(h => --h.life > 0);

    // === Scroll pickups
    for (let i = scrolls.length - 1; i >= 0; i--) {
        if (checkCollision(player, scrolls[i])) {
            playSound("magic_scroll", volumeSFX);
            setTimeout(() => playSound("win", volumeMusic), 500);
            spawnParticles("block", scrolls[i].x + scrolls[i].width / 2, scrolls[i].y + scrolls[i].height / 2 - 20);
            spawnParticles("hit", scrolls[i].x + scrolls[i].width / 2, scrolls[i].y + scrolls[i].height / 2 - 20);
            scrolls.splice(i, 1);
            endLevel2();
        }
    }

// === Trophy pickups (fixed)
for (let i = trophies.length - 1; i >= 0; i--) {
    const trophy = trophies[i];
    const playerRight = player.x + player.width;

    // Trigger very deep inside, almost at the wall
    const triggerStart = trophy.x + 320;  // Move start deeper into the trophy
    const triggerEnd = trophy.x + 200;  // Keep this at the original boundary to avoid overlap with the wall

    if (
        playerRight >= triggerStart &&
        player.x <= triggerEnd &&
        player.y + player.height > trophy.y &&
        player.y < trophy.y + trophy.height
    ) {
        playSound("win", volumeMusic);
        spawnParticles("block", trophy.x + trophy.width / 2, trophy.y + trophy.height / 2 - 20);
        spawnParticles("hit", trophy.x + trophy.width / 2, trophy.y + trophy.height / 2 - 20);
        trophies.splice(i, 1);
        endLevel1();
        }
    }
}

function performMeleeAttack() {
    if (!player || player.dead) return;
    if (player.isBlocking || player.attackCooldown > 0) return;

    // === Adjusted for longer visible slash ===
    player.attackCooldown = 13;
    player.attackTimer = 7;
    player.isAttacking = true;
    playSound("slash-1", volumeSFX);

    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        const reach = 8;
        if (checkCollision(player, enemy, reach)) {
            if (enemy.spriteSet === "barricade") {
                enemy.health -= player.damage || 1;
                enemy.hitFlash = 10;
                enemy.glow = "red";
                enemy.glowTimer = 10;
                spawnParticles("hit", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 - 20);
                playSound("sword_hit", volumeSFX);
                if (enemy.health <= 0) handleEnemyDeath(enemy);
                continue;
            }

            const blocked = Math.random() < (enemy.blockChance || 0);
            if (blocked) {
                playSound("block", volumeSFX);
                spawnParticles("block", enemy.x, enemy.y);
                enemy.glow = "blue";
                enemy.glowTimer = 10;
                continue;
            }

            enemy.health -= player.damage || 1;
            enemy.hitFlash = 10;
            enemy.glow = "red";
            enemy.glowTimer = 10;
            spawnParticles("hit", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 - 20);
            playSound("sword_hit", volumeSFX);
            if (enemy.health <= 0) handleEnemyDeath(enemy);
        }
    }
}


// ==============================
// 5. ENEMY LOGIC
// ==============================

function enemyInView(enemy) {
    return (
        enemy.x >= camera.x - 100 &&
        enemy.x <= camera.x + GAME_WIDTH + 200
    );
}

    // === ENEMY REACH
function enemyInRange(enemy) {
    return checkCollision(player, enemy, 16); // 16px buffer = melee reach
}


function enemyReadyToAttack(enemy) {
    return (enemy.attackCooldown ?? 0) <= 0;
}

function updateEnemies(dt) {
    if (!player || player.dead || bossCutsceneActive) return;

    const barricades = enemies.filter(e => e.spriteSet === "barricade" && !e.dead);

    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        // === FULL FREEZE DURING PAUSE OR GAMEOVER ===
        if (gameState === "paused" || gameState === "gameover") {
            continue; // no movement, no animation, fully frozen
        }

        // ✅ DYNAMIC FLIP BASED ON PLAYER POSITION
        if (enemy.spriteSet !== "barricade") {
            enemy.facing = (player.x < enemy.x) ? "left" : "right";
        }

        // === Boss intro logic ===
        if (
            (enemy.spriteSet === "bandit_leader" || enemy.spriteSet === "zombie_lord") &&
            !bossIntroTriggered
        ) {
            if (enemy.x - camera.x < GAME_WIDTH && gameState === "playing") {
                bossIntroTriggered = true;
                bossCutsceneActive = true;
                stopAllSounds();

                const bossSound = enemy.spriteSet === "zombie_lord" ? "zombie_lord" : "bandit_leader";

                setTimeout(() => {
                    playSound(bossSound, volumeVoices);
                    setTimeout(() => {
                        playSound("quinn2", volumeVoices);
                        setTimeout(() => {
                            bossCutsceneActive = false;
                        }, 1500); // was 2000
                    }, 2000); // was 2500
                }, 250); // was 500
            }
        }

        if (!enemyInView(enemy) || gameState !== "playing") continue;

        // === Timers ===
        if (enemy.hitFlash > 0) enemy.hitFlash--;
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;
        if (enemy.castCooldown > 0) enemy.castCooldown--;

        // === Projectile casting logic ===
        if (
            enemy.spriteSet === "big_goblin" ||
            enemy.spriteSet === "bandit_crossbow" ||
            enemy.spriteSet === "necromancer" ||
            enemy.spriteSet === "zombie_lord"
        ) {
            if (enemy.casting > 0) {
                enemy.casting++;

                if (enemy.casting === 30) {
                    let type, vx, xOffset, width, height, damage;

                    if (enemy.spriteSet === "big_goblin") {
                        type = "acid";
                        vx = enemy.facing === "left" ? -4 : 4;
                        xOffset = enemy.facing === "left" ? -32 : enemy.width + 10;
                        width = 96;
                        height = 64;
                        damage = 1;
                    } 
                    else if (enemy.spriteSet === "bandit_crossbow") {
                        type = "crossbow_bolt";
                        vx = enemy.facing === "left" ? -6 : 6;
                        xOffset = enemy.facing === "left" ? -32 : enemy.width + 10;
                        width = 64;
                        height = 16;
                        damage = 2;
                    } 
                    else if (enemy.spriteSet === "necromancer" || enemy.spriteSet === "zombie_lord") {
                        type = "evil_magic";
                        vx = enemy.facing === "left" ? -3 : 3;
                        xOffset = enemy.facing === "left" ? -32 : enemy.width + 10;
                        width = 72;
                        height = 72;
                        damage = 2;
                    }

                    projectiles.push({
    type,
    owner: "enemy",
    x: enemy.x + xOffset,
    y: enemy.y + enemy.height / 2 - height / 2,
    vx,
    vy: 0,
    width,
    height,
    damage,
    spawnFrame: frame
});


                    playSound(type, volumeSFX);
                }

                if (enemy.casting >= 60) {
                    enemy.casting = 0;
                    if (enemy.spriteSet === "big_goblin") enemy.castCooldown = 180;
                    else if (enemy.spriteSet === "bandit_crossbow") enemy.castCooldown = 120;
                    else enemy.castCooldown = 150; // necromancer / zombie_lord
                    enemy.sprite = "idle";
                }

                continue;
            }

            const outOfRange = !enemyInRange(enemy);
            if (enemy.castCooldown <= 0 && outOfRange && enemyInView(enemy)) {
                enemy.casting = 1;
                if (enemy.spriteSet === "big_goblin") enemy.sprite = "goblin_magic";
                else if (enemy.spriteSet === "necromancer") enemy.sprite = "necromancer_magic";
                else if (enemy.spriteSet === "zombie_lord") enemy.sprite = "necromancer_magic";
                else enemy.sprite = "idle"; // bandit_crossbow
                continue;
            }
        }

        // === Slash / Melee Attack Phase ===
        if (enemy.attackTimer > 0) {
            enemy.attackTimer--;
            continue;
        }
        
        if (enemyInRange(enemy) && enemyReadyToAttack(enemy)) {
            enemy.sprite = "slash";
            enemy.attacking = true;
            enemy.attackCooldown = enemy.attackRate ?? 45;
            enemy.attackTimer = 20;

            if (player.isBlocking) {
                playSound("block", volumeSFX);
                spawnParticles("block", player.x, player.y);
                player.glow = "blue";
                player.glowTimer = 10;
                player.vx -= 4 * (enemy.x < player.x ? -1 : 1);
            } else {
                if (Math.random() < (enemy.blockChance || 0)) {
                    enemy.blocking = true;
                    playSound("block", volumeSFX);
                    spawnParticles("block", enemy.x, enemy.y);
                    enemy.glow = "blue";
                    enemy.glowTimer = 10;
                } else {
                    enemy.blocking = false;
                    playSound("slash-2", volumeSFX);
                    if (!player.invincible) {
                        hurtPlayer(enemy.damage ?? 1);
                        player.glow = "red";
                        player.glowTimer = 10;
                    }
                }
            }

            continue;
        }

        // === Lock barricades in place (skip movement logic) ===
        if (enemy.spriteSet === "barricade") {
            enemy.vx = 0;
            enemy.vy = 0;
            continue;
        }

        // === Movement logic ===
        const dir = player.x < enemy.x ? -1 : 1;
        const nextX = enemy.x + dir * enemy.speed * dt;
        const nextMidX = nextX + enemy.width / 2;
        const playerMidX = player.x + player.width / 2;
        const dist = Math.abs(nextMidX - playerMidX);
        const stopBuffer = 16;

        if (dist > stopBuffer) {
            enemy.x = nextX;
        }

        enemy.vx = dir * enemy.speed;
        enemy.attacking = false;

        // === Prevent passing through barricades ===
        for (let b of barricades) {
            const blocked =
                enemy.x + enemy.width > b.x &&
                enemy.x < b.x + b.width &&
                Math.abs(enemy.y - b.y) < enemy.height;

            if (blocked) {
                if (enemy.vx > 0) {
                    enemy.x = b.x - enemy.width;
                } else if (enemy.vx < 0) {
                    enemy.x = b.x + b.width;
                }
                enemy.vx = 0;
            }
        }

        // === Soft push enemies off Quinn ===
        const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
        if (Math.abs(dx) < 4) {
            enemy.x += dx >= 0 ? 1.5 : -1.5;
        }

        // === Prevent overlapping other enemies ===
        for (let other of enemies) {
            if (other !== enemy && !other.dead) {
                const dx = enemy.x - other.x;
                if (Math.abs(dx) < enemy.width && Math.abs(enemy.y - other.y) < enemy.height) {
                    enemy.x += dx > 0 ? 1 : -1;
                }
            }
        }
    }
}



// ==============================
// 6. PROJECTILE & COMBAT LOGIC
// ==============================

function castFireball() {
    const fireball = {
        x: player.facing === "right" ? player.x + player.width : player.x - 40,
        y: player.y + 60,
        width: 80,
        height: 90,
        vx: player.facing === "right" ? 12 : -12,
        owner: "player",
        damage: 2,
        type: "fireball",
        spawnFrame: frame
    };

    playSound("fireball", volumeSFX);
    projectiles.push(fireball);
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];

        // === Update projectile position
        p.x += p.vx * dt;
        p.y += (p.vy || 0) * dt;

        // === Remove projectile if out of bounds
        if (p.x < 0 || p.x > levelBounds.right || p.y < 0 || p.y > GAME_HEIGHT) {
            projectiles.splice(i, 1);
            continue;
        }

        // === Player projectile hits barricade
        if (p.owner === "player") {
            for (let b of enemies) {
                if (!b.dead && b.spriteSet === "barricade" && checkCollision(p, b)) {
                    b.health--;
                    b.glow = "red";
                    b.glowTimer = 10;
                    b.hitFlash = 10;
                    spawnParticles("hit", b.x, b.y);
                    playSound("sword_hit", volumeSFX);

                    if (b.health <= 0) {
                        b.dead = true;
                        playSound("broke", volumeSFX);
                    }

                    projectiles.splice(i, 1);
                    break;
                }
            }

            // === Player projectile hits enemy
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                if (!enemy || enemy.dead) continue;

                // === Check collision
                if (checkCollision(p, enemy)) {
                    const blockChance = enemy.blockChance || 0;
                    const blocked = Math.random() < blockChance;

                    if (blocked) {
    // === BLOCK RESPONSE
    playSound("block", volumeSFX);
    const yOffset = enemy.height * 0.6; // Mid-body impact
    spawnParticles("block", enemy.x, enemy.y - yOffset);

    enemy.glow = "white";
    enemy.glowTimer = 10;
    enemy.knockbackX = p.vx * 0.75; // ✅ Pushback even when blocked

    projectiles.splice(i, 1); // Cancel projectile
    break;
}


                    // === HIT RESPONSE
                    enemy.health -= p.damage || 2;
                    enemy.vx = p.vx * 0.8; // Push enemy back
                    enemy.hitFlash = 10;
                    enemy.glow = "red";
                    enemy.glowTimer = 10;

                    spawnParticles("hit", enemy.x, enemy.y);
                    playSound("fireball_hit", volumeSFX); // Universal hit sound

                    if (enemy.health <= 0) {
                        handleEnemyDeath(enemy);
                        enemy.vx = 0; // Ensure no pushback on dead
                    }

                    projectiles.splice(i, 1);
                    break;
                }
            }
            continue;
        }

        // === Enemy projectile hits player
if (checkCollision(p, player)) {
    projectiles.splice(i, 1);

    if (player.isBlocking) {
        playSound("block", volumeSFX);
        spawnParticles("block", player.x, player.y);
        player.knockbackX = p.vx * 0.75; // ✅ Pushback when blocked
        player.glow = "blue";
        player.glowTimer = 10;
    } else {
        const dmg = Math.max(0, p.damage || 1);
        if (!player.invincible && dmg > 0) {
            hurtPlayer(dmg);

            // ✅ Hit sounds for enemy projectiles
            if (p.type === "acid") {
                playSound("acid_hit", volumeSFX);
            } else {
                playSound(p.type, volumeSFX); // evil_magic, crossbow_bolt, etc.
            }

            spawnParticles("hit", player.x, player.y);
            player.glow = "red";
            player.glowTimer = 10;
            player.knockbackX = p.vx * 1; // ✅ Pushback when not blocked
        }
    }
}
    }
}


function getHitSound(type) {
    if (type === "acid") return "acid_hit";
    if (type === "crossbow_bolt") return "sword_hit";
    if (type === "evil_magic") return "evil_magic_hit"; // ✅ preloaded safely
    return "fireball_hit";
}

function hurtPlayer(damage) {
    player.health -= damage;
    if (player.health <= 0) {
        handlePlayerDeath();
    } else {
        playSound("quinn-hurt", volumeVoices);
    }
}

function handlePlayerDeath() {
    player.dead = true;
    gameState = "gameover";
    stopAllSounds(); // ✅ stop background music
    playSound("quinn-hurt", volumeVoices); // voice
    playSound("lose", volumeMusic); // game over music
}

function updateGlow() {
    if (!player) return;

    // === Player glow logic ===
    if (player.invincible) {
        player.glow = "yellow";
    } else if (player.hitFlash > 0) {
        player.glow = "red";
    } else if (player.glowTimer > 0) {
        player.glowTimer--;
        if (player.glowTimer === 0) {
            player.glow = null;
        }
    } else {
        player.glow = null;
    }

    // === Enemy glow logic ===
    if (Array.isArray(enemies)) {
        for (let enemy of enemies) {
            if (!enemy || enemy.dead) continue;
            if (enemy.glowTimer > 0) {
                enemy.glowTimer--;
                if (enemy.glowTimer === 0) {
                    enemy.glow = null;
                }
            }
        }
    }
} // ✅ properly close updateGlow()

function updateParticles(dt) {
    const maxParticles = 300;
    if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life--;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


// ==============================
// 7. LEVEL BACKGROUNDS
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
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 0,
                bgWidth, bgHeight
            );
        }

        const road = images.road1;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, roadY + dy,
                bgWidth, GROUND_HEIGHT
            );
        }
    }
}

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
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 0,
                bgWidth, bgHeight
            );
        }

        const road = images.road2;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, roadY + dy,
                bgWidth, GROUND_HEIGHT
            );
        }
    }
}

function drawLevel3Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background3;
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 15,
                bgWidth, bgHeight
            );
        }

        const road = images.road3;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, roadY + dy,
                bgWidth, GROUND_HEIGHT
            );
        }
    }
}


// ==============================
// 8. DRAWING SYSTEMS
// ==============================

function drawTrimmedSprite(img, x, y, width, height, facing = "right", glow = null) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(img, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 50) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // === GLOW EFFECT (CRITICAL)
    if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
    }

    // === Draw facing
    if (facing === "left") {
        ctx.save();
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    } else {
        ctx.drawImage(tempCanvas, x, y);
    }

    // === Reset glow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
}

function drawDeadEnemies() {
    for (let enemy of enemies) {
        if (!enemy.dead) continue;
        const set = enemy.spriteSet;
        const spriteKey = `${set}_dead`;
        let corpseHeight = enemy.height;
        let offsetY = 0;

        if (
            set === "big_goblin" ||
            set === "necromancer" ||
            set === "zombie_lord"
        ) {
            corpseHeight = enemy.height * 0.65;
            offsetY = enemy.height * 0.35;
        }

        if (set === "bandit" || set === "bandit_crossbow") {
            offsetY = 40;
        }

        if (images[spriteKey]) {
            drawTrimmedSprite(
                images[spriteKey],
                enemy.x - camera.x,
                enemy.y + offsetY,
                enemy.width,
                corpseHeight,
                enemy.facing,
                null
            );
        } else {
            ctx.fillStyle = "darkgray";
            ctx.fillRect(enemy.x - camera.x, enemy.y + offsetY, enemy.width, corpseHeight);
        }
    }
}


function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        const spriteSet = enemy.spriteSet;
        const frameMod = frame % 16 < 8;
        let spriteKey = null;

// Only advance animation frames when playing
        if (gameState !== "playing") {
            // Draw current frame without changing sprite index
            drawTrimmedSprite(
                enemy.currentFrame, // must use whatever property holds the current frame image
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height,
                enemy.facing,
                enemy.glow
            );
            continue;
        }

        if (enemy.attacking && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (
            (spriteSet === "big_goblin" || spriteSet === "necromancer" || spriteSet === "zombie_lord") &&
            enemy.casting > 0 &&
            images[`${spriteSet}_magic`]
        ) {
            spriteKey = `${spriteSet}_magic`;
        } else if (enemy.blocking && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (enemy.hitFlash > 0 && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (spriteSet === "bandit_crossbow") {
            spriteKey = enemy.casting > 0 ? "bandit_crossbow_2" : "bandit_crossbow_1";
        } else if (enemy.vx !== 0 && images[`${spriteSet}_run1`] && images[`${spriteSet}_run2`]) {
            spriteKey = frameMod ? `${spriteSet}_run1` : `${spriteSet}_run2`;
        } else if (images[`${spriteSet}_idle`]) {
            spriteKey = `${spriteSet}_idle`;
        }

        const img = spriteKey ? images[spriteKey] : null;
        const facing = enemy.facing ?? "right";

        if (img) {
            drawTrimmedSprite(
                img,
                enemy.x - camera.x,
                enemy.y,
                enemy.width,
                enemy.height,
                facing,
                enemy.glow
            );
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(enemy.x - camera.x, enemy.y, enemy.width, enemy.height);
        }
    }
}

// ==============================
// 8. DRAWING SYSTEMS
// ==============================

function drawTrimmedSprite(img, x, y, width, height, facing = "right", glow = null) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(img, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 50) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // === GLOW EFFECT (CRITICAL)
    if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
    }

    // === Draw facing
    if (facing === "left") {
        ctx.save();
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    } else {
        ctx.drawImage(tempCanvas, x, y);
    }

    // === Reset glow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
}

function drawDeadEnemies() {
    for (let enemy of enemies) {
        if (!enemy.dead) continue;
        const set = enemy.spriteSet;
        const spriteKey = `${set}_dead`;
        let corpseHeight = enemy.height;
        let offsetY = 0;

        if (
            set === "big_goblin" ||
            set === "necromancer" ||
            set === "zombie_lord"
        ) {
            corpseHeight = enemy.height * 0.65;
            offsetY = enemy.height * 0.35;
        }

        if (set === "bandit" || set === "bandit_crossbow") {
            offsetY = 40;
        }

        if (images[spriteKey]) {
            drawTrimmedSprite(
                images[spriteKey],
                enemy.x - camera.x,
                enemy.y + offsetY,
                enemy.width,
                corpseHeight,
                enemy.facing,
                null
            );
        } else {
            ctx.fillStyle = "darkgray";
            ctx.fillRect(enemy.x - camera.x, enemy.y + offsetY, enemy.width, corpseHeight);
        }
    }
}

function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        const spriteSet = enemy.spriteSet;
        const frameMod = frame % 16 < 8;
        let spriteKey = null;

        if (enemy.attacking && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (
            (spriteSet === "big_goblin" || spriteSet === "necromancer" || spriteSet === "zombie_lord") &&
            enemy.casting > 0 &&
            images[`${spriteSet}_magic`]
        ) {
            spriteKey = `${spriteSet}_magic`;
        } else if (enemy.blocking && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (enemy.hitFlash > 0 && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (spriteSet === "bandit_crossbow") {
            spriteKey = enemy.casting > 0 ? "bandit_crossbow_2" : "bandit_crossbow_1";
        } else if (enemy.vx !== 0 && images[`${spriteSet}_run1`] && images[`${spriteSet}_run2`]) {
            spriteKey = frameMod ? `${spriteSet}_run1` : `${spriteSet}_run2`;
        } else if (images[`${spriteSet}_idle`]) {
            spriteKey = `${spriteSet}_idle`;
        }

        const img = spriteKey ? images[spriteKey] : null;
        const facing = enemy.facing ?? "right";

        if (img) {
            drawTrimmedSprite(
                img,
                enemy.x - camera.x,
                enemy.y,
                enemy.width,
                enemy.height,
                facing,
                enemy.glow
            );
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(enemy.x - camera.x, enemy.y, enemy.width, enemy.height);
        }
    }
}

function drawPlayer() {
    if (!player) return;

    let sprite = null;
    let yOffset = 0;
    const standingOffset = 30;

    // === Death animation ===
    if (player.dead && images.quinn_dead) {
        sprite = images.quinn_dead;
        yOffset = 80;

    // === Casting magic ===
    } else if (player.castingMagic && images.quinn_casting) {
        sprite = images.quinn_casting;

    } else if (player.isBlocking && images.quinn_block) {
    sprite = images.quinn_block;

    // Adjust block sprite height alignment
    // Negative value moves it up, positive moves it down
    yOffset = -28; // <-- tweak this until feet match other animations

    // === Melee attack ===
    } else if ((player.attackTimer > 0 || player.isAttacking) && images.quinn_slash) {
        sprite = images.quinn_slash;

    // === Movement ===
    } else if (Math.abs(player.vx) > 1) {
        // Always use 4-step cycle if available
        const haveRun123 = images.quinn_run1 && images.quinn_run2 && images.quinn_run3;
        if (haveRun123) {
            const step = Math.floor((frame % 40) / 10); // 0..3
            const runSeq = [images.quinn_run1, images.quinn_run2, images.quinn_run3, images.quinn_run2];
            sprite = runSeq[step];
        } else if (images.quinn_run1 && images.quinn_run2) {
            sprite = (frame % 20 < 10) ? images.quinn_run1 : images.quinn_run2;
        }

    // === Idle ===
    } else if (images.quinn_idle) {
        sprite = images.quinn_idle;
    }

    // === Draw final sprite ===
    if (sprite) {
        const width = sprite.width;
        const height = sprite.height;

        let glowColor = player.glow || null;
        if (player.invincible) glowColor = "yellow";
        else if (player.hitFlash > 0) glowColor = "red";

        drawTrimmedSprite(
    sprite,
    player.x - camera.x,
    player.y + (player.dead ? yOffset : standingOffset + yOffset),
    width,
    height,
    player.facing,
    glowColor
);
    }
}


// === DRAW PICKUPS ===
function drawPickups() {
    for (let coin of coins) {
        const bounce = Math.sin((frame - coin.spawnFrame) / 5) * 5;
        const angle = ((frame - coin.spawnFrame) % 360) * 0.05;

        if (images.coin) {
            ctx.save();
            ctx.translate(coin.x - camera.x + coin.width / 2, coin.y + bounce + coin.height / 2);
            ctx.rotate(angle);
            ctx.drawImage(images.coin, -coin.width / 2, -coin.height / 2, coin.width, coin.height);
            ctx.restore();
        } else {
            ctx.fillStyle = "gold";
            ctx.fillRect(coin.x - camera.x, coin.y + bounce, coin.width, coin.height);
        }
    }

  // === DRAW HEARTS ===
    for (let heart of hearts) {
        const bounce = Math.sin((frame - heart.spawnFrame) / 5) * 5;

        if (images.heart) {
            ctx.drawImage(images.heart, heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        }
    }
  
// === DRAW SCROLLS ===
    for (let scroll of scrolls) {
        const bounce = Math.sin((frame - scroll.spawnFrame) / 5) * 5;
        const angle = ((frame - scroll.spawnFrame) % 360) * 0.05;

        if (images.magic_scroll) {
            ctx.save();
            ctx.translate(scroll.x - camera.x + scroll.width / 2, scroll.y + bounce + scroll.height / 2);
            ctx.rotate(angle);
            ctx.drawImage(images.magic_scroll, -scroll.width / 2, -scroll.height / 2, scroll.width, scroll.height);
            ctx.restore();
        } else {
            ctx.fillStyle = "purple";
            ctx.fillRect(scroll.x - camera.x, scroll.y + bounce, scroll.width, scroll.height);
        }
    }
}

// === DRAW PARTICLES ===
function drawParticles() {
    for (let p of particles) {
        if (p.type === "hit") ctx.fillStyle = "red";
        else if (p.type === "block") ctx.fillStyle = "white";
        else if (p.type === "dead") ctx.fillStyle = "darkred";
        else ctx.fillStyle = "gray";

        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y, 2.5, 0, Math.PI * 2); // ✅ smaller radius
        ctx.fill();
    }
}

// === DRAW TROPHIES ===
function drawTrophies() {
    for (let trophy of trophies) {
        if (images.cave_entrance && trophy.type === "cave") {
            ctx.drawImage(images.cave_entrance, trophy.x - camera.x, trophy.y + 75, trophy.width, trophy.height);
        } else if (images.towngates) {
            ctx.drawImage(images.towngates, trophy.x - camera.x, trophy.y + 75, trophy.width, trophy.height);
        } else {
            ctx.fillStyle = "gray";
            ctx.fillRect(trophy.x - camera.x, trophy.y, trophy.width, trophy.height);
        }
    }
}

// === DRAW PROJECTILES ===
function drawProjectiles() {
    for (let p of projectiles) {
        let spriteKey = p.type;
        if (p.type === "acid") spriteKey = "acid_magic";
        if (p.type === "crossbow_bolt") spriteKey = "crossbow_bolt";
        if (p.type === "fireball") spriteKey = "fireball";
        if (p.type === "evil_magic") spriteKey = "evil_magic"; // ✅ NEW LINE

        let flip = p.vx < 0;

        if (images[spriteKey]) {
            drawTrimmedSprite(images[spriteKey], p.x - camera.x, p.y, p.width, p.height, flip ? "left" : "right");
        } else {
            ctx.fillStyle = "orange";
            ctx.fillRect(p.x - camera.x, p.y, p.width, p.height);
        }
    }
}

// === DRAW BANDIT LEADER HEALTHBAR ===
function drawBanditLeaderHealth() {
    const boss = enemies.find(e => e.spriteSet === "bandit_leader" && !e.dead);
    if (!boss) return;

    ctx.fillStyle = "black";
    ctx.fillRect(GAME_WIDTH / 2 - 102, 48, 204, 24);

    ctx.fillStyle = "red";
    const width = (boss.health / boss.maxHealth) * 200;
    ctx.fillRect(GAME_WIDTH / 2 - 100, 50, width, 20);

    ctx.strokeStyle = "white";
    ctx.strokeRect(GAME_WIDTH / 2 - 100, 50, 200, 20);
}

// === DRAW HUD ===
function drawHUD() {
    if (!player) return;

    const plateX = 10;
    const plateY = 10;
    const plateWidth = 400;
    const plateHeight = 160;

    if (images.hud_health) {
        ctx.drawImage(images.hud_health, plateX, plateY, plateWidth, plateHeight);
    }

    const startX = plateX + (plateWidth - (5 * 36)) / 2;
    const startY = plateY + (plateHeight - (2 * 36)) / 2;

    for (let i = 0; i < player.maxHealth; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const heartX = startX + col * 36;
        const heartY = startY + row * 36;

        if (i < player.health && images.heart) {
            ctx.drawImage(images.heart, heartX, heartY, 32, 32);
        } else {
            ctx.strokeStyle = "#444";
            ctx.strokeRect(heartX, heartY, 32, 32);
        }
    }

    const magicBarWidth = 96;
    const magicBarHeight = 96;
    const magicMeterX = plateX + 80;
    const magicMeterY = plateY + plateHeight - 12;
    const magicPct = 1 - (player.magicCooldown / 300);

    if (images.hud_magic_empty) {
        ctx.drawImage(images.hud_magic_empty, magicMeterX, magicMeterY, magicBarWidth, magicBarHeight);
    }

    if (images.hud_magic_full && magicPct > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(magicMeterX, magicMeterY, magicBarWidth * magicPct, magicBarHeight);
        ctx.clip();
        ctx.drawImage(images.hud_magic_full, magicMeterX, magicMeterY, magicBarWidth, magicBarHeight);
        ctx.restore();
    }

    const coinX = magicMeterX + magicBarWidth + 24;
    const coinY = magicMeterY;

    if (images.coin) {
        ctx.drawImage(images.coin, coinX, coinY, 32, 32);
    }

    ctx.fillStyle = "#FFD700";
    ctx.font = "20px 'MedievalSharp'";
    ctx.textAlign = "left";
    ctx.fillText(`x ${coinCount}`, coinX + 40, coinY + 24);

    ctx.font = "18px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Level ${currentLevel}`, coinX, coinY + 48);
}

// === DRAW ===
function draw() {
    frame++;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // === Game Screens
    if (gameState === "title") return drawTitleScreen();
    if (gameState === "settings") return drawSettingsPanel();
    if (gameState === "gameover") return drawGameOverScreen();

    if (gameState === "levelstart") {
        if (currentLevel === 1) return drawEndScreen1();
        if (currentLevel === 2) return drawEndScreen2();
        if (currentLevel === 3) return drawEndScreen3();
    }

    if (gameState === "gamecomplete") return drawEndScreenFinal();

    // === Background
    if (currentLevel === 1) {
        drawLevel1Background();
    } else if (currentLevel === 2) {
        drawLevel2Background();
    } else if (currentLevel === 3) {
        drawLevel3Background();
    }

    // === Gameplay Draw Order
    drawTrophies();
    drawDeadEnemies();
    drawParticles();
    drawPlayer();
    drawEnemies();
    drawProjectiles();
    drawPickups();
    drawHUD();
    drawBanditLeaderHealth();

    if (gameState === "paused") {
        drawPauseOverlay();
    }
}

// ==============================
// 9. GAME SCREENS & FLOW CONTROL
// ==============================

function drawTitleScreen() {
    // === Background
    if (images.title) {
        ctx.drawImage(images.title, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // === Start Button
    const btnW = 200;
    const btnH = 80;
    const btnX = (canvas.width - btnW) / 2;
    const btnY = canvas.height - btnH - 20;

    if (!startClicked && images.start1) {
        ctx.drawImage(images.start1, btnX, btnY, btnW, btnH);
    } else if (startClicked && images.start2) {
        ctx.drawImage(images.start2, btnX, btnY, btnW, btnH);
    }

    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}

function drawGameOverScreen() {
    // 1) Blur the actual gameplay render (no updates)
    ctx.save();
    ctx.filter = "blur(4px)";

    // Background per level
    if (currentLevel === 1)      drawLevel1Background();
    else if (currentLevel === 2) drawLevel2Background();
    else if (currentLevel === 3) drawLevel3Background();

    // Draw everything as a still frame
    drawTrophies();
    drawDeadEnemies();
    drawParticles();
    drawPlayer();
    drawEnemies();
    drawProjectiles();
    drawPickups();
    drawHUD();

    ctx.restore();

    // 2) Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 3) Retry button (same size/pos as other screens)
    const btnW = 200;
    const btnH = 80;
    const btnX = (canvas.width - btnW) / 2;
    const btnY = canvas.height - btnH - 20;

    if (!retryClicked && images.retry1) {
        ctx.drawImage(images.retry1,     btnX, btnY, btnW, btnH);
    } else if (retryClicked && images.retry2) {
        ctx.drawImage(images.retry2,     btnX, btnY, btnW, btnH);
    }

    // Click bounds
    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}



function drawEndScreen1() {
    if (images.end_screen1) {
        ctx.drawImage(images.end_screen1, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    const btnW = 200;
    const btnH = 80;
    const btnX = (canvas.width - btnW) / 2;
    const btnY = canvas.height - btnH - 20;

    // === Updated Button Logic ===
    if (!nextLevelClicked && images.next_level1) {
        ctx.drawImage(images.next_level1, btnX, btnY, btnW, btnH);
    } else if (nextLevelClicked && images.next_level2) {
        ctx.drawImage(images.next_level2, btnX, btnY, btnW, btnH);
    }

    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}

function drawEndScreen2() {
    if (images.end_screen2) {
        ctx.drawImage(images.end_screen2, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // === Button Dimensions ===
    const btnW = 200;
    const btnH = 80;
    const btnX = (canvas.width - btnW) / 2;
    const btnY = canvas.height - btnH - 20;

    // === Button Logic ===
    if (!nextLevelClicked && images.next_level1) {
        ctx.drawImage(images.next_level1, btnX, btnY, btnW, btnH);
    } else if (nextLevelClicked && images.next_level2) {
        ctx.drawImage(images.next_level2, btnX, btnY, btnW, btnH);
    }

    // === Update Bounds for Click Handler ===
    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}

function drawSettingsPanel() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(100, 100, GAME_WIDTH - 200, GAME_HEIGHT - 200);

    ctx.fillStyle = "white";
    ctx.font = "28px 'MedievalSharp'";
    ctx.textAlign = "left";
    ctx.fillText("SETTINGS", 140, 180);  // ⬇️ shifted from 160 to 180

    // === Volume Sliders ===
    drawVolumeSlider("Music", volumeMusic, 210, (val) => volumeMusic = val);   // ⬇️ was 180
    drawVolumeSlider("SFX", volumeSFX, 290, (val) => volumeSFX = val);         // ⬇️ was 260
    drawVolumeSlider("Voices", volumeVoices, 370, (val) => volumeVoices = val); // ⬇️ was 340

    // === Controls ===
    ctx.font = "22px 'MedievalSharp'";
    ctx.fillStyle = "lime";
    ctx.fillText("Controls:", 140, 460);  // ⬇️ was 420

    ctx.font = "18px 'MedievalSharp'";
    const controls = [
        "← / → : Move left/right",
        "↑ : Block",
        "↓ : Melee attack",
        "Space : Jump",
        "Shift : Cast Fireball",
        "I : Toggle Invincibility",
        "P : Pause",
        "ESC : Settings",
        "R : Restart",
        "T : Return to Title"
    ];
    for (let i = 0; i < controls.length; i++) {
        ctx.fillText(controls[i], 160, 490 + i * 28);  // ⬇️ shifted base from 450 to 490
    }
}

function drawVolumeSlider(label, value, y, onChange) {
    const x = 140;
    const width = 300;
    const height = 20;
    const filledWidth = width * value;

    ctx.font = "20px 'MedievalSharp'";
    ctx.fillStyle = "white";
    ctx.fillText(`${label}: ${(value * 100).toFixed(0)}%`, x, y - 10);

    ctx.fillStyle = "#555";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#0f0";
    ctx.fillRect(x, y, filledWidth, height);
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "white";
    ctx.font = "48px 'MedievalSharp'";
    ctx.textAlign = "center";
    ctx.fillText("-- Paused --", GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

 canvas.addEventListener("click", (e) => {
    if (gameState !== "settings") return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    handleSliderClick(mx, my, 210, (v) => volumeMusic = v);
    handleSliderClick(mx, my, 290, (v) => volumeSFX = v);
    handleSliderClick(mx, my, 370, (v) => volumeVoices = v);
});

function handleSliderClick(mx, my, y, setter) {
    const x = 140;
    const width = 300;
    const height = 20;
    const buffer = 10;

    if (
        mx >= x - buffer && mx <= x + width + buffer &&
        my >= y - buffer && my <= y + height + buffer
    ) {
        const value = (mx - x) / width;
        setter(Math.max(0, Math.min(1, value)));
    }
}


// ==============================
// 10. GAME ENTITIES
// ==============================

function staggeredGroundY(height, embedOffset = 0, customEmbed = null) {
    const buffer = 4;
    const embed = customEmbed !== null
        ? -customEmbed
        : 35 + Math.random() * 10 + embedOffset;
    return GAME_HEIGHT - GROUND_HEIGHT - height + embed - buffer;
}

// === GOBLIN ===
function createGoblin(x) {
    return {
        x,
        y: staggeredGroundY(110),
        width: 110,
        height: 110,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 2,
        health: 1,
        damage: 1,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "goblin",
    };
}

// === BIG GOBLIN ===
function createBigGoblin(x) {
    return {
        x,
        y: staggeredGroundY(170, -20),
        width: 170,
        height: 170,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 1.5,
        health: 2,
        damage: 1,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 30,
        casting: 0,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "big_goblin",
    };
}

// === BANDIT ===
function createBandit(x) {
    return {
        x,
        y: staggeredGroundY(160),
        width: 160,
        height: 160,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 2,
        health: 1,
        damage: 1,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "bandit",
    };
}

// === BANDIT CROSSBOW ===
function createBanditCrossbow(x) {
    return {
        x,
        y: staggeredGroundY(160),
        width: 160,
        height: 160,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 0,
        health: 2,
        damage: 0,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 40,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "bandit_crossbow",
    };
}

// === BANDIT LEADER ===
function createBanditLeader(x, y) {
    return {
        x,
        y,
        width: 190,
        height: 190,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 2,
        health: 5,
        maxHealth: 5,
        damage: 2,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 40,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.4,
        spriteSet: "bandit_leader",
    };
}

// === BARRICADE ===
function createBarricade(x) {
    return {
        x: x - 450,
        y: staggeredGroundY(128),
        width: 128,
        height: 128,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 0,
        health: 3,
        damage: 0,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 9999,
        castCooldown: 9999,
        castWhenOutOfRange: false,
        blockChance: 0,
        spriteSet: "barricade"
    };
}

// === ZOMBIE ===
function createZombie(x) {
    return {
        x,
        y: staggeredGroundY(128),
        width: 128,
        height: 128,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 1,
        health: 1,
        damage: 1,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "zombie"
    };
}

// === NECROMANCER ===
function createNecromancer(x) {
    return {
        x,
        y: staggeredGroundY(170, -20),
        width: 170,
        height: 170,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 1.5,
        health: 2,
        damage: 2,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 30,
        casting: 0,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "necromancer"
    };
}

// === ZOMBIE LORD ===
function createZombieLord(x, y) {
    return {
        x,
        y,
        width: 190,
        height: 190,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 1.5,
        health: 5,
        maxHealth: 5,
        damage: 2,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 40,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.4,
        spriteSet: "zombie_lord"
    };
}

// === PICKUP SPAWN HELPERS ===
function spawnCoin(x, y) {
    const dropOffsetX = -8;
    coins.push({ x: x + dropOffsetX, y, width: 25, height: 25, spriteSet: "coin", value: 1, spawnFrame: frame, life: 2000 });
}

function spawnHeart(x, y) {
    const dropOffsetX = -8;
    hearts.push({ x: x + dropOffsetX, y, width: 30, height: 30, spriteSet: "heart", value: 1, spawnFrame: frame, life: 2000 });
}


// === ENEMY DEATH HANDLER (ground-aligned drops) ===
function handleEnemyDeath(enemy) {
    enemy.dead = true;
    enemy.attacking = false;
    enemy.vx = 0;
    enemy.deathTimer = 0;
    enemy.sprite = enemy.spriteSet + "_dead";

    const groundY = GAME_HEIGHT - GROUND_HEIGHT;
    const dropOffsetX = -8; // shift all loot left slightly
    const margin = 20; // distance from level edges

    // Clamp helper
    function clampDropX(x) {
        return Math.max(levelBounds.left + margin, Math.min(x, levelBounds.right - margin));
    }

    // === Adjust corpse position based on enemy type ===
    switch (enemy.spriteSet) {
        case "goblin":
            enemy.height = 88;
            enemy.y = groundY - enemy.height + 18;
            break;
        case "big_goblin":
            enemy.y = groundY - 200 + 85;
            break;
        case "bandit":
        case "bandit_crossbow":
            enemy.y = groundY - 120 + 28;
            break;
        case "bandit_leader":
    enemy.y = groundY - 140 + 36;

    // Force scroll to spawn just left of invisible wall for Level 2
    const scrollXBoss = (levelBounds?.right || GAME_WIDTH) - 120; // safe fallback
    const scrollYBoss = GAME_HEIGHT - GROUND_HEIGHT - 34;

    scrolls.push({
        x: scrollXBoss,
        y: scrollYBoss,
        width: 50,
        height: 34,
        spawnFrame: frame
    });
    break;


        case "zombie":
            enemy.y = groundY - enemy.height + 20;
            break;
        case "zombie_lord":
            enemy.y = groundY - enemy.height + 36;
            spawnScroll(
                clampDropX(enemy.x + enemy.width + 20 + dropOffsetX),
                enemy.y
            );
            break;
        case "barricade":
            enemy.y += 40;
            break;
        default:
            // End-of-level scroll (unchanged logic)
            const scrollX = levelBounds.right - 100;
            spawnScroll(scrollX, groundY - 34);
            break;
    }

    spawnParticles("dead", enemy.x, enemy.y);

    // === Regular coin/heart drops (all clamped + offset) ===
    const dropX = clampDropX(enemy.x + enemy.width + 16 + dropOffsetX);
    const dropY = groundY - 34;

    spawnCoin(dropX, dropY);

    if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "bandit_crossbow") {
        spawnHeart(clampDropX(dropX + 32), dropY);
    }
}


// === COLLISION & PARTICLES ===
function checkCollision(a, b, padding = 0) {
    return (
        a.x < b.x + b.width - padding &&
        a.x + a.width - padding > b.x &&
        a.y < b.y + b.height - padding &&
        a.y + a.height - padding > b.y
    );
}

function spawnParticles(type, x, y, count = 12) {
    const originY = y + 20 + Math.random() * 6 - 3;
    for (let i = 0; i < count; i++) {
        const dirX = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.5);
        const dirY = 1 + Math.random() * 1.5;
        particles.push({
            type,
            x: x + Math.random() * 20 - 10,
            y: originY,
            vx: dirX,
            vy: dirY,
            life: 30 + Math.floor(Math.random() * 20)
        });
    }
}

// === Kick off the engine ===
window.onload = () => {
    init();
};
