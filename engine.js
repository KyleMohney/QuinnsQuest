// ==============================
// QUINN'S QUEST ENGINE
// ==============================
// TABLE OF CONTENTS
// 1. Constants & Globals
// 2. Game State & Level Loop
// 3. Input Handling
// 4. Player Combat
// 5. Combat Logic
// 6. Level Backgrounds & Boundaries
// 7. Drawing Systems
// 8. Game Screens & Start Logic
// 9. Game Entities
// ==============================
// 1. CONSTANTS & GLOBALS
// Stop a sound by name
function stopSound(name) {
    if (sounds[name]) {
        try {
            sounds[name].pause();
            sounds[name].currentTime = 0;
        } catch (e) {
            // Ignore errors if sound is not playing
        }
    }
}
let chapterNum = 1; // Tracks current chapter for transitions
// === Level State Reset ===
function resetLevelState() {
    trophies = [];
    enemies = [];
    hearts = [];
    scrolls = [];
    projectiles = [];
    particles = [];
    keys = [];
    claire = [];
}

window.toggleMute = function() {
    muted = !muted;
};

window.toggleInvincibility = function() {
    if (player) {
        player.invincible = !player.invincible;
        player.glow = player.invincible ? "yellow" : null;
    } else {
        // If player is not defined or null, continue safely
    }
};

window.setPaused = function() {
    if (typeof gameState !== 'undefined') {
        gameState = gameState === "playing" ? "paused" : "playing";
    }
};

window.setSettings = function() {
    if (typeof gameState !== 'undefined') {
        if (gameState === "playing") {
            gameState = "settings";
            window.showSettingsPanel = true;
        } else {
            gameState = "playing";
            window.showSettingsPanel = false;
        }
    }
};

window.tryRestartGame = function() {
    if (typeof gameState !== 'undefined' && gameState === "gameover" && typeof restartGame === 'function') {
        // Full state reset for retry
        resetLevelState();
        if (typeof window.resetPlayer === 'function') {
            window.resetPlayer();
            player.x = 100;
            player.y = GAME_HEIGHT - GROUND_HEIGHT - (player.height || 100);
            player.dead = false;
            player.isAttacking = false;
            player.isBlocking = false;
            player.castingMagic = false;
            player.invincible = false;
            player.glow = null;
            player.glowTimer = 0;
            player.attackCooldown = 0;
            player.attackTimer = 0;
            player.knockbackX = 0;
            player.health = player.maxHealth || 5;
        }
        camera.x = 0;
        camera.y = 0;
        restartGame();
    }
};
const ENTITY_SCALE = 1.5;
let activeSounds = []; // Tracks currently playing sound objects
const canvas = document.getElementById("gameCanvas"); // Main game canvas
const ctx = canvas.getContext("2d"); // 2D drawing context
let GAME_WIDTH = window.innerWidth; // Current game width
let GAME_HEIGHT = window.innerHeight; // Current game height
const GROUND_HEIGHT = 140; // Raised to better align road with background and barricades
const PLAYER_Y_OFFSET = 0; // Vertical offset for player spawn position
const PLAYER_FOOT_OFFSET = 45; // Offset for Quinn's feet to visually land on the road
const GRAVITY = 2.5; // Gravity acceleration for player physics
let titleMusicPlayed = false;
let nextLevelClicked = false;
let startClicked = false; // Tracks if the start button has been clicked
let bossCutsceneActive = false; // Tracks if boss cutscene is active
let showSettingsPanel = false; // ✅ Added declaration for showSettingsPanel
let retryClicked = false; // Tracks if the retry button has been clicked

// === Music Handle ===
let currentMusic = null; // ✅ tracks currently playing background music

// === Audio Settings ===
window.volumeMusic = 0.45;   // Controls background music volume
window.volumeSFX = 0.35;     // Controls sound effects volume (e.g. pickups, slash)
window.volumeVoices = 1.0;  // Controls voice/voiceover volume (e.g. Quinn, Leader)
const MAX_SIMULTANEOUS_SOUNDS = 8; // Maximum number of simultaneous sound effects

// === Object Collections ===
let images = {};
let sounds = {};
let keys = [];
let player = null;
let enemies = [];
let projectiles = [];
let particles = [];
let coins = [];
let hearts = [];
let trophies = [];
let scrolls = [];
let claire = [];
let pickups = [];
let levelBounds = { left: 0, right: 5000 };

// === Camera & Frame Counter ===
let camera = { x: 0, y: 0 };
let frame = 0;
let shakeTimer = 0;
let cameraShakeAmount = 0;
let lastAttackSoundFrame = -100;
let lastPickupSoundFrame = -100;
let nextLevelTransitionTimer = 0; // Timer for delayed next level transition
let bossIntroTriggered = false; // Tracks if boss intro has played

// === Time Delta Support ===
let lastTime = 0;
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
            let startGameCalled = false;

            function checkAllLoaded() {
                if (!startGameCalled && loaded === total) {
                    startGameCalled = true;
                    startGame();
                }
            }

            // === Load Sprites ===
            for (const key in map.sprites) {
                const img = new Image();
                img.onload = () => {
                    loaded++;
                    checkAllLoaded();
                };
                img.onerror = () => {
                    loaded++;
                    checkAllLoaded();
                };
                img.src = map.sprites[key];
                images[key] = img;
            }

            // === Load Sounds ===
            for (const key in map.sounds) {
                const audio = new Audio(map.sounds[key]);
                audio.oncanplaythrough = () => {
                    loaded++;
                    checkAllLoaded();
                };
                audio.onerror = () => {
                    loaded++;
                    checkAllLoaded();
                };
                sounds[key] = audio;
            }
    });
}

// INIT
function init() {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // === Unlock all audio playback on first mouse movement (user interaction) ===
    let audioUnlocked = false;
    window.addEventListener("mousemove", evt => {
        if (!audioUnlocked) {
            // Play a silent sound to unlock audio context for all sounds
            try {
                const silent = new Audio();
                silent.volume = 0;
                silent.play();
            } catch (e) {}
            audioUnlocked = true;
        }
        if (gameState === "title" && !titleMusicPlayed) {
            playSound("title", window.volumeMusic);
            titleMusicPlayed = true;
        }
    });

    // === Keyboard Listeners ===
        window.addEventListener("keydown", e => {
            keys[e.key] = true;
            if (typeof window.playerKeyDown === 'function') {
                window.playerKeyDown(e);
            }
        });

        window.addEventListener("keyup", e => {
            keys[e.key] = false;
            if (typeof window.playerKeyUp === 'function') {
                window.playerKeyUp(e);
            }
        });

    loadAssets();
    // Button click logic moved to HUD.js Section 5 for modularity.
}

// Ensure init runs when the page loads
window.onload = init;

// ==============================
// 2. GAME STATE & LEVEL LOOP
// ==============================
// title, playing, levelstart, gameover,gamecomplete,paused,settings
let gameState = "title";    // Current game state
let currentLevel = 1;       // Current level number
let coinCount = 0;          // Coins collected in current level

function startGame() {
    stopAllSounds();
    setTimeout(function() {
        playSound("title", window.volumeMusic);
    }, 100);
    gameState = "title";
    resizeCanvas();
    requestAnimationFrame(gameLoop);
}

//END LEVEL LOGIC
function endLevel7() {
    stopAllSounds();
    // Ensure title music is stopped before starting next level
        playSound("win", window.volumeMusic);
        gameState = "credits";
        nextLevelClicked = false;
        // Optionally show credits screen
        if (typeof showCreditsScreen === 'function') showCreditsScreen();
        // Define button bounds for click detection (if needed)
    const buttonWidth = 200;
    const buttonHeight = 80;
    const startX = canvas.width - buttonWidth - 40;
    const startY = canvas.height - buttonHeight - 20;
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight };
}

function restartGame() {
    stopAllSounds();
    retryClicked = false;
    titleMusicPlayed = false;
    if (currentLevel === 1) startLevel1();
    else if (currentLevel === 2) startLevel2();
    else if (currentLevel === 3) startLevel3();
    else if (currentLevel === 4) startLevel4();
    else if (currentLevel === 5) startLevel5();
    else if (currentLevel === 6) startLevel6(); 
}

function playSound(name, volume = 1.0) {
    if (!muted && sounds[name]) {
        // Limit simultaneous sound effects
        if (activeSounds.length >= MAX_SIMULTANEOUS_SOUNDS && !["title", "background1", "background2", "background3", "win"].includes(name)) {
            return;
        }
        // Debounce pickup and attack sounds
        if (name === "pickup" && typeof frame !== "undefined" && frame - lastPickupSoundFrame < 10) return;
        if (name === "coin" && typeof frame !== "undefined" && frame - lastPickupSoundFrame < 10) return;
        if ((name === "slash-1" || name === "sword_hit") && typeof frame !== "undefined" && frame - lastAttackSoundFrame < 8) return;

        try {
            const sound = sounds[name].cloneNode();
            sound.volume = volume;

            // Loop background music for levels 1, 2, 3, 4, 5, and 6
            if (name === "background1" || name === "background2" || name === "background3" || name === "background4" || name === "background5" || name === "background6") {
                sound.loop = true;
            }

            // Track for stopping later
            activeSounds.push(sound);
            sound.onended = () => {
                activeSounds = activeSounds.filter(s => s !== sound);
            };

            if (["title", "background1", "background2", "background3", "background4", "background5", "background6", "win"].includes(name)) {
                if (currentMusic) {
                    currentMusic.pause();
                    currentMusic.currentTime = 0;
                }
                currentMusic = sound;
            }

            // Update debounce frames
            if (name === "pickup" || name === "coin") lastPickupSoundFrame = frame;
            if (name === "slash-1" || name === "sword_hit") lastAttackSoundFrame = frame;

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
        ["title", "levelstart", "gameover", "gamecomplete", "paused", "settings"].includes(gameState) &&
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
            currentLevel === 3 ? "background3" :
            currentLevel === 4 ? "background4" :
            currentLevel === 5 ? "background5" :
            currentLevel === 6 ? "background6" :
            null;

        if (music) {
            playSound(music, window.volumeMusic);
        }
    }

    // === Handle delayed transition to Level 2
    if (gameState === "levelstart" && currentLevel === 1 && nextLevelTransitionTimer > 0) {
        if (frame >= nextLevelTransitionTimer) {
            playSound("click", window.volumeSFX);
            nextLevelTransitionTimer = 0;
            startLevel2();
            return;
        }
    }

        // === Handle delayed transition to Level 3
    if (gameState === "levelstart" && currentLevel === 2 && nextLevelTransitionTimer > 0) {
        if (frame >= nextLevelTransitionTimer) {
            playSound("click", window.volumeSFX);
            nextLevelTransitionTimer = 0;
            startLevel3();
            return;
        }
    }

    // === Handle delayed transition to Level 4
    if (gameState === "levelstart" && currentLevel === 3 && nextLevelTransitionTimer > 0) {
        if (frame >= nextLevelTransitionTimer) {
            playSound("click", window.volumeSFX);
            nextLevelTransitionTimer = 0;
            startLevel4();
            return;
        }
    }

    // === Handle delayed transition to Level 5
    if (gameState === "levelstart" && currentLevel === 4 && nextLevelTransitionTimer > 0) {
        if (frame >= nextLevelTransitionTimer) {
            playSound("click", window.volumeSFX);
            nextLevelTransitionTimer = 0;
            startLevel5();
            return;
        }
    }

    // === Handle delayed transition to Level 6
    if (gameState === "levelstart" && currentLevel === 5 && nextLevelTransitionTimer > 0) {
        if (frame >= nextLevelTransitionTimer) {
            playSound("click", window.volumeSFX);
            nextLevelTransitionTimer = 0;
            startLevel6();
            return;
        }
    }

    // === Core game updates
    if (gameState === "playing") {
        if (typeof window.updatePlayer === 'function') {
            window.updatePlayer(dt);
        }
        updateCombat();
        updateEnemies(dt);
        updateProjectiles(dt);
        updateGlow();
        updateParticles(dt);
        if (player) {
        }
    }

    // Decrement subtitle timer for frame-accurate subtitle disappearance
    if (subtitleTimer > 0) subtitleTimer -= deltaTime;
    applyCameraShake();
    draw();

    // === Key Pickup Detection ===
    if (gameState === "playing" && keys && player) {
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            // Simple collision check
            if (
                player.x < key.x + key.width &&
                player.x + player.width > key.x &&
                player.y < key.y + key.height &&
                player.y + player.height > key.y
            ) {
                // Key picked up: win level
                keys.splice(i, 1);
                stopAllSounds();
                playSound("win", window.volumeMusic);
                gameState = "levelstart";
                nextLevelClicked = false;
                // Optionally trigger levelComplete flag for current level
                if (currentLevel === 5) level5Complete = true;
                if (currentLevel === 4) level4Complete = true;
                if (currentLevel === 3) level3Complete = true;
                if (currentLevel === 2) level2Complete = true;
                if (currentLevel === 1) level1Complete = true;
            }
        }
    }

    // === Town Gates Collision Detection for Level 2 ===
    if (gameState === "playing" && currentLevel === 2 && player && trophies && trophies.length) {
        for (let trophy of trophies) {
            if (trophy.type === "gate") {
                // Require player to be at least 2/3 inside the gate before triggering win
                if (
                    player.x + player.width > trophy.x + trophy.width * (2/3) &&
                    player.x < trophy.x + trophy.width &&
                    player.y < trophy.y + trophy.height &&
                    player.y + player.height > trophy.y
                ) {
                    endLevel2();
                }
            }
        }
    }
    // === Cave Entrance Collision Detection for Level 3 ===
    if (gameState === "playing" && currentLevel === 3 && player && trophies && trophies.length) {
        for (let trophy of trophies) {
            if (trophy.type === "cave") {
                if (
                    player.x < trophy.x + trophy.width &&
                    player.x + player.width > trophy.x &&
                    player.y < trophy.y + trophy.height &&
                    player.y + player.height > trophy.y
                ) {
                    endLevel3();
                }
            }
        }
    }
        // === Town Gates Two Collision Detection for Level 5 ===
        if (gameState === "playing" && currentLevel === 5 && player && trophies && trophies.length) {
            for (let trophy of trophies) {
                if (trophy.type === "gate2") {
                    // Require player to be at least 2/3 inside the gate before triggering win
                    if (
                        player.x + player.width > trophy.x + trophy.width * (2/3) &&
                        player.x < trophy.x + trophy.width &&
                        player.y < trophy.y + trophy.height &&
                        player.y + player.height > trophy.y
                    ) {
                        endLevel5();
                    }
                }
            }
        }
    lastGameState = gameState;
    frame++;
    requestAnimationFrame(gameLoop);
}

// ==============================
// 3. INPUT HANDLING
// ==============================

// === Mute State ===
let muted = false; // Controls global sound muting

// ==============================
// 4. PLAYER COMBAT
// ==============================
function updateCombat() {
    // Player attack logic
    if (player && player.requestedAttack && !player.isAttacking && !player.dead) {
        for (let enemy of enemies) {
            if (!enemy || enemy.dead) continue;
            playerAttackEnemy(enemy);
        }
    }

    // Player fireball logic
    if (player && player.requestedFireball && !player.dead) {
        castFireball();
        player.requestedFireball = false;
    }
}

function playerAttackEnemy(enemy) {
    let meleePadding = 16;
    let hit = false;
    if (enemy.spriteSet === "barricade" && player.facing === "right") {
        // Temporarily extend player's width for collision check, and use zero padding
        const originalWidth = player.width;
        player.width += 32; // extend reach by 32px
        if (checkCollision(player, enemy, 0)) {
            hit = true;
        }
        player.width = originalWidth; // restore width
    } else {
        if (checkCollision(player, enemy, meleePadding)) {
            hit = true;
        }
    }
    if (hit) {
        enemy.hitFlash = 10;
        enemy.glow = "red";
        enemy.glowTimer = 10;
        enemy.health -= player.damage || 1;
        enemy.vx += player.facing === "right" ? 8 : -8;
        if (enemy.spriteSet === "hound") {
            playSound("dog_dead", window.volumeSFX);
        } else if (enemy.spriteSet === "bandit_lord") {
            playSound("bandit_lord_hurt", window.volumeSFX);
        } else {
            playSound("slash-1", window.volumeSFX);
        }
        hit = true;
        if (enemy.health <= 0) {
            if (enemy.spriteSet === "hound") {
                playSound("dog_dead", window.volumeSFX);
            } else if (enemy.spriteSet === "bandit_lord") {
                playSound("bandit_lord_dead", window.volumeSFX);
            }
            handleEnemyDeath(enemy);
        }
    }
    player.attackCooldown = 9;
    player.attackTimer = 5;
    player.isAttacking = true;
    if (!hit) playSound("slash-1", window.volumeSFX * 0.5); // play a miss sound
    player.requestedAttack = false;
}
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

    playSound("fireball", window.volumeSFX);
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
                    playSound("sword_hit", window.volumeSFX);

                    if (b.health <= 0) {
                        b.dead = true;
                        playSound("broke", window.volumeSFX);
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
                        playSound("block", window.volumeSFX);
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
                    if (enemy.spriteSet === "bandit_lord") {
                        playSound("bandit_lord_hurt", window.volumeSFX);
                    } else {
                        playSound("fireball_hit", window.volumeSFX); // Universal hit sound
                    }

                    if (enemy.health <= 0) {
                        if (enemy.spriteSet === "bandit_lord") {
                            playSound("bandit_lord_dead", window.volumeSFX);
                        }
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
                playSound("block", window.volumeSFX);
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
                        playSound("acid_hit", window.volumeSFX);
                    } else {
                        playSound(p.type, window.volumeSFX); // evil_magic, crossbow_bolt, etc.
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

function hurtPlayer(damage) {
    player.health -= damage;
    if (player.health <= 0) {
        handlePlayerDeath();
    } else {
    playSound("quinn-hurt", window.volumeVoices);
    }
}

function handlePlayerDeath() {
    player.dead = true;
    gameState = "gameover";
    stopAllSounds(); // ✅ stop background music
    playSound("quinn-hurt", window.volumeVoices); // voice
    playSound("lose", window.volumeMusic); // game over music
}

// === Player glow logic ===
function updateGlow() {
    if (!player) return;
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
}

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
// 6. LEVEL BACKGROUNDS
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
                drawX, roadY + dy - 5,
                bgWidth, GROUND_HEIGHT + 5
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
    const bgHeight = canvas.height; // Fill entire canvas height
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
                drawX, 0,
                bgWidth, bgHeight
            );
        }

        const road = images.road3;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, canvas.height - GROUND_HEIGHT + dy,
                bgWidth, GROUND_HEIGHT + 20 // Increase road height to compensate
            );
        }
    }
}

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
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 0,
                bgWidth, bgHeight
            );
        }

        const road = images.road4;
        if (road && road.naturalWidth && road.naturalHeight) {
            const roadYOffset = 10; // Raise road by 10 pixels
            const roadHeight = GROUND_HEIGHT + 10; // Make road 10 pixels taller
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, roadY + dy - roadYOffset,
                bgWidth, roadHeight
            );
        }
    }
}

function drawLevel5Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background5;
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 0, // Fill from very top
                bgWidth, canvas.height // Stretch to full canvas height
            );
        }

        const road = images.road5;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, canvas.height - GROUND_HEIGHT + dy,
                bgWidth, GROUND_HEIGHT
            );
        }
        }
    }

// === LEVEL 6 BACKGROUND DRAW ===
function drawLevel6Background() {
    const roadY = canvas.height - GROUND_HEIGHT;
    const bgHeight = canvas.height - GROUND_HEIGHT;
    const scrollFactor = 0.3;
    const bgWidth = canvas.width;
    const offsetX = -(camera.x * scrollFactor) % bgWidth;
    const { dx, dy } = getCameraShakeOffset();

    for (let i = -1; i <= 1; i++) {
        const drawX = offsetX + i * bgWidth + dx;

        const bg = images.background6;
        if (bg && bg.naturalWidth && bg.naturalHeight) {
            ctx.drawImage(
                bg,
                0, 0, bg.naturalWidth, bg.naturalHeight,
                drawX, 0,
                bgWidth, bgHeight
            );
        }

        const road = images.road6;
        if (road && road.naturalWidth && road.naturalHeight) {
            ctx.drawImage(
                road,
                0, 0, road.naturalWidth, road.naturalHeight,
                drawX, canvas.height - GROUND_HEIGHT + dy,
                bgWidth, GROUND_HEIGHT + 20 // Increase road height by another 10 pixels
            );
        }
    }

    // === Soft smoke layer on top ===
    ctx.save();
    ctx.globalAlpha = 0.22;
    let smokeGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.33);
    smokeGradient.addColorStop(0, "rgba(180,180,180,0.55)");
    smokeGradient.addColorStop(0.5, "rgba(180,180,180,0.18)");
    smokeGradient.addColorStop(1, "rgba(180,180,180,0.01)");
    ctx.fillStyle = smokeGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.33);
    ctx.restore();
}

// ==============================
// 7. DRAWING SYSTEMS
// ==============================
function drawTrimmedSprite(img, x, y, width, height, facing = "right", glow = null) {
    // Guard: If img is missing or not a valid image, do nothing
    if (!img || !img.width || !img.height || !img.complete) {
        return;
    }

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

    // === GLOW EFFECT (draw as a separate layer behind sprite) ===
    if (glow) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        if (facing === "left") {
            ctx.translate(x + width * ENTITY_SCALE, y);
            ctx.scale(-1, 1);
            ctx.drawImage(tempCanvas, 0, 0, width * ENTITY_SCALE, height * ENTITY_SCALE);
        } else {
            ctx.drawImage(tempCanvas, x, y, width * ENTITY_SCALE, height * ENTITY_SCALE);
        }
        ctx.restore();
    }

    // === Draw actual sprite ===
    if (facing === "left") {
        ctx.save();
        ctx.translate(x + width * ENTITY_SCALE, y);
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, 0, 0, width * ENTITY_SCALE, height * ENTITY_SCALE);
        ctx.restore();
    } else {
        ctx.drawImage(tempCanvas, x, y, width * ENTITY_SCALE, height * ENTITY_SCALE);
    }
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
            set === "zombie_lord" ||
            set === "zombie"
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
            // Increase necromancer casting sprite size
            if (spriteSet === "necromancer") {
                enemy.width = 160;
                enemy.height = 160;
            }
        } else if (enemy.blocking && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (enemy.hitFlash > 0 && images[`${spriteSet}_slash`]) {
            spriteKey = `${spriteSet}_slash`;
        } else if (spriteSet === "bandit_crossbow") {
            spriteKey = enemy.casting > 0 ? "bandit_crossbow_2" : "bandit_crossbow_1";
        } else if (enemy.vx !== 0 && images[`${spriteSet}_run1`] && images[`${spriteSet}_run2`]) {
                // Use 4-step run cycle for zombies (1,2,3,2)
                if (spriteSet === "zombie" && images.zombie_run1 && images.zombie_run2 && images.zombie_run3) {
                    const step = Math.floor((frame % 16) / 4); // 0..3
                    const runSeq = ["zombie_run1", "zombie_run2", "zombie_run3", "zombie_run2"];
                    spriteKey = runSeq[step];
                } else if (spriteSet === "hound" && images.hound_run1 && images.hound_run2 && images.hound_run3) {
                    const step = Math.floor((frame % 16) / 4); // 0..3
                    const runSeq = ["hound_run1", "hound_run2", "hound_run3", "hound_run2"];
                    spriteKey = runSeq[step];
                } else {
                    spriteKey = frameMod ? `${spriteSet}_run1` : `${spriteSet}_run2`;
                }
        } else if (images[`${spriteSet}_idle`]) {
            spriteKey = `${spriteSet}_idle`;
            // Increase necromancer idle sprite size
            if (spriteSet === "necromancer") {
                enemy.width = 160;
                enemy.height = 160;
            }
        }

        const img = spriteKey ? images[spriteKey] : null;
        const facing = enemy.facing ?? "right";

        if (img) {
            ctx.save();
            drawTrimmedSprite(
                img,
                enemy.x - camera.x,
                enemy.y,
                enemy.width,
                enemy.height,
                facing,
                enemy.glow
            );
            ctx.restore();
        } else {
            ctx.save();
            ctx.fillStyle = "red";
            ctx.fillRect(enemy.x - camera.x, enemy.y, enemy.width, enemy.height);
            ctx.restore();
        }
    }
}

// === DRAW PLAYER ===
function drawPlayer() {
    if (!player) return;

    let sprite = null;
    let yOffset = 0;
    const standingOffset = 48; // Restore previous offset for proper height

    // === Death animation ===
    if (player.dead && images.quinn_dead) {
        sprite = images.quinn_dead;
        yOffset = 0; // Use same offset for death for now

    // === Casting magic ===
    } else if (player.castingMagic && images.quinn_casting) {
        sprite = images.quinn_casting;
        yOffset = 0;

    } else if (player.isBlocking && images.quinn_block) {
        sprite = images.quinn_block;
        yOffset = -28; // Adjust block pose so feet match other poses

    // === Melee attack ===
    } else if ((player.attackTimer > 0 || player.isAttacking) && images.quinn_slash) {
        sprite = images.quinn_slash;
        yOffset = 0;

    // === Movement ===
    } else if (Math.abs(player.vx) > 1) {
        // Always use 4-step cycle if available
        const haveRun123 = images.quinn_run1 && images.quinn_run2 && images.quinn_run3;
        if (haveRun123) {
            const step = Math.floor((frame % 16) / 4); // Slower cycle: 0..3
            const runSeq = [images.quinn_run1, images.quinn_run2, images.quinn_run3, images.quinn_run2];
            sprite = runSeq[step];
            yOffset = 0;
        } else if (images.quinn_run1 && images.quinn_run2) {
            sprite = (frame % 20 < 10) ? images.quinn_run1 : images.quinn_run2;
            yOffset = 0;
        }

    // === Idle ===
    } else if (images.quinn_idle) {
        sprite = images.quinn_idle;
        yOffset = 0;
    }

    // === Draw final sprite with drop shadow ===
    if (sprite) {
        const width = sprite.width;
        const height = sprite.height;

        let glowColor = player.glow || null;
        if (player.invincible) glowColor = "yellow";
        else if (player.hitFlash > 0) glowColor = "red";

    ctx.save();
        drawTrimmedSprite(
            sprite,
            player.x - camera.x,
            player.y + standingOffset + yOffset,
            width,
            height,
            player.facing,
            glowColor
        );
        ctx.restore();
    }
}

// === DRAW PICKUPS ===
function drawPickups() {
    // === DRAW COINS ===
    for (let coin of coins) {
        let spawnFrame = typeof coin.spawnFrame === 'number' ? coin.spawnFrame : 0;
        let bounce = Math.sin((frame - spawnFrame) / 5) * 5;
        let angle = ((frame - spawnFrame) % 360) * 0.05;
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
        let spawnFrame = typeof heart.spawnFrame === 'number' ? heart.spawnFrame : 0;
        let bounce = Math.sin((frame - spawnFrame) / 5) * 5;
        if (images.heart) {
            ctx.drawImage(images.heart, heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        }
    }

    // === DRAW SCROLLS ===
    for (let scroll of scrolls) {
    let spawnFrame = typeof scroll.spawnFrame === 'number' ? scroll.spawnFrame : 0;
    let bounce = Math.sin((frame - spawnFrame) / 5) * 5;
    let angle = ((frame - spawnFrame) % 360) * 0.05;
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

    // === DRAW KEYS ===
    for (let key of keys) {
        let bounce = Math.sin((frame - (key.spawnFrame || 0)) / 5) * 5;
        if (images.key) {
            ctx.drawImage(images.key, key.x - camera.x, key.y + bounce, key.width, key.height);
        } else {
            ctx.fillStyle = "#FFD700";
            ctx.fillRect(key.x - camera.x, key.y + bounce, key.width, key.height);
        }
    }

    // === DRAW CLAIRE PICKUP ===
    for (let pickup of pickups) {
        if (pickup.type === "claire") {
            const sprite = pickup.winState && images.claire_win ? images.claire_win : images.claire_idle;
            if (sprite) {
                ctx.drawImage(sprite, pickup.x - camera.x, pickup.y, pickup.width, pickup.height);
            }
            // Spawn celebratory colorful particles (once)
            if (!pickup.particlesSpawned) {
                pickup.particlesSpawned = true;
                for (let i = 0; i < 32; i++) {
                    const angle = (Math.PI * 2 * i) / 32;
                    const speed = 3 + Math.random() * 2;
                    const color = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
                    particles.push({
                        x: pickup.x,
                        y: pickup.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 40 + Math.random() * 20,
                        type: "celebrate",
                        color: color
                    });
                }
            }
                // Check for player collision with Claire
                if (!pickup.collected &&
                    player.x + player.width > pickup.x &&
                    player.x < pickup.x + pickup.width &&
                    player.y + player.height > pickup.y &&
                    player.y < pickup.y + pickup.height) {
                    pickup.collected = true;
                    pickup.winState = true;
                    pickup.collectFrame = frame;
                }
                // If Claire has been collected, show win pose for 3 seconds, then switch to level 7 card
                if (pickup.collected) {
                    currentLevel = 7;
                    showChapterScreen(7); // Transition to Chapter 7 card immediately
                }
        }
    }
}

// === DRAW PARTICLES ===
function drawParticles() {
    for (let p of particles) {
        if (p.type === "celebrate") {
            ctx.fillStyle = p.color || "yellow";
        } else if (p.type === "hit") ctx.fillStyle = "red";
        else if (p.type === "block") ctx.fillStyle = "white";
        else if (p.type === "dead") ctx.fillStyle = "darkred";
        else ctx.fillStyle = "gray";

        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y, p.type === "celebrate" ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// === DRAW TROPHIES ===
function drawTrophies() {
    // PATCH: Do not draw trophies in level 4 (matches level 2 behavior)
    if (currentLevel === 4 || currentLevel === 6) return;
    for (let trophy of trophies) {
        if (images.cave_entrance && trophy.type === "cave") {
            ctx.drawImage(images.cave_entrance, trophy.x - camera.x, trophy.y + 75, trophy.width, trophy.height);
        } else if (images.towngates && trophy.type === "gate") {
            // Draw so the bottom of the gates is flush with the bottom of the screen
            const yFlush = GAME_HEIGHT - trophy.height;
            ctx.drawImage(images.towngates, trophy.x - camera.x, yFlush, trophy.width, trophy.height);
        } else if (images.towngates2 && trophy.type === "gate2") {
            // Draw so the bottom of the gates is flush with the bottom of the screen
            const yFlush = GAME_HEIGHT - trophy.height;
            ctx.drawImage(images.towngates2, trophy.x - camera.x, yFlush, trophy.width, trophy.height);
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
            // Draw projectile sprite only, no drop shadow
            drawTrimmedSprite(images[spriteKey], p.x - camera.x, p.y, p.width, p.height, flip ? "left" : "right");
        } else {
            ctx.fillStyle = "orange";
            ctx.fillRect(p.x - camera.x, p.y, p.width, p.height);
        }
    }
}

// === DRAW BOSS HEALTHBARS ===
function drawBanditLordHealth() {
    const boss = enemies.find(e => e.spriteSet === "bandit_lord" && !e.dead);
    if (!boss) return;
    if (!enemyInView(boss)) return;

    const barWidth = 408;
    const barHeight = 48;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 250;

    ctx.fillStyle = "black";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#1e90ff"; // Bandit Lord: blue health bar
    const width = (boss.health / boss.maxHealth) * (barWidth - 4);
    ctx.fillRect(barX + 2, barY + 2, width, barHeight - 4);

    ctx.strokeStyle = "white";
    ctx.strokeRect(barX, barY, barWidth, barHeight);
}
function drawBanditLeaderHealth() {
    const boss = enemies.find(e => e.spriteSet === "bandit_leader" && !e.dead);
    if (!boss) return;
    // Show health bar as long as boss is alive and in view
    if (!enemyInView(boss)) return;

    // Move health bar just below HUD and double its size
    const barWidth = 408;
    const barHeight = 48;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 250; // Lowered further below HUD for visibility

    ctx.fillStyle = "black";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "red";
    const width = (boss.health / boss.maxHealth) * (barWidth - 4);
    ctx.fillRect(barX + 2, barY + 2, width, barHeight - 4);

    ctx.strokeStyle = "white";
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    // === DRAW ZOMBIE LORD HEALTHBAR ===
    function drawZombieLordHealth() {
        const boss = enemies.find(e => e.spriteSet === "zombie_lord" && !e.dead);
        if (!boss) return;
        // Show health bar as long as boss is alive and in view
        if (!enemyInView(boss)) return;

    // Move health bar just below HUD and double its size
    const barWidth = 408;
    const barHeight = 48;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 250; // Lowered further below HUD for visibility

        ctx.fillStyle = "black";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "purple";
        const width = (boss.health / boss.maxHealth) * (barWidth - 4);
        ctx.fillRect(barX + 2, barY + 2, width, barHeight - 4);

        ctx.strokeStyle = "white";
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    // === DRAW HOUND HEALTHBAR ===
    function drawHoundHealth() {
        const hound = enemies.find(e => e.spriteSet === "hound" && !e.dead);
        if (!hound) return;
        // Show health bar as long as boss is alive and in view
        if (!enemyInView(hound)) return;

    const barWidth = 408;
    const barHeight = 48;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    // Position below Bandit Lord's health bar
    const barY = 250 + barHeight + 12; // 12px gap between bars

        ctx.fillStyle = "black";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "#a0522d"; // Hound: brown health bar
        const width = (hound.health / hound.maxHealth) * (barWidth - 4);
        ctx.fillRect(barX + 2, barY + 2, width, barHeight - 4);

        ctx.strokeStyle = "white";
        ctx.strokeRect(barX, barY, barWidth, barHeight);
}

// === PAUSE OVERLAY ===
function drawPauseOverlay() {
    ctx.save();
    ctx.filter = "blur(6px)";

    // Draw gameplay as a blurred still frame
    if (currentLevel === 1)      drawLevel1Background();
    else if (currentLevel === 2) drawLevel2Background();
    else if (currentLevel === 3) drawLevel3Background();
    else if (currentLevel === 4) drawLevel4Background();
    else if (currentLevel === 5) drawLevel5Background();
    else if (currentLevel === 6) drawLevel6Background();

    // === DRAW ORDER ===
    drawTrophies();
    drawDeadEnemies();
    drawParticles();
    drawPlayer();   
    drawEnemies();
    drawProjectiles();
    drawPickups();
    window.drawHUD(ctx, canvas, player, images);
    ctx.restore();

    // Overlay
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // PAUSED text
    ctx.save();
    ctx.font = "64px Arial Black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

    // SETTINGS PANEL OVERLAY
function drawSettingsPanelOverlay() {

    // Draw close button
    const btnW = 56;
    const btnH = 56;
    const btnX = Math.max(18, (canvas.width * 0.275));
    const btnY = Math.min(canvas.height - btnH - 18, (canvas.height * 0.68));
                    
                    // Directional cone overlay
                    const coneLength = 320;
                    const coneWidth = 90; // degrees
                    const facing = player.facing === "left" ? Math.PI : 0;
                    ctx.save();
                    ctx.translate(headX, headY);
                    ctx.rotate(facing);
                    const coneGradient = ctx.createLinearGradient(0, 0, coneLength, 0);
                    coneGradient.addColorStop(0, "rgba(255,255,220,0.45)");
                    coneGradient.addColorStop(0.5, "rgba(255,255,220,0.18)");
                    coneGradient.addColorStop(1, "rgba(255,255,220,0.01)");
                    ctx.fillStyle = coneGradient;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, coneLength, -coneWidth * Math.PI / 360, coneWidth * Math.PI / 360, false);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
    let closeBtnActive = window.closeBtnActive || false;
    let closeBtnImg = closeBtnActive && images.close2 && images.close2.complete ? images.close2 : images.close1 && images.close1.complete ? images.close1 : null;
    if (closeBtnImg) {
        ctx.drawImage(closeBtnImg, btnX, btnY, btnW, btnH);
    }
    window.closeBtnRegion = { x: btnX, y: btnY, width: btnW, height: btnH };
}

// === UNIVERSAL BUTTON DRAWER ===
function drawUniversalButton(type) {
    // type: 'start', 'retry', 'nextLevel', 'close'
    let btnW, btnH, btnX, btnY, img1, img2, clicked;
    if (type === 'close') {
        btnW = 56;
        btnH = 56;
        btnX = Math.max(18, (canvas.width * 0.275));
        btnY = Math.min(canvas.height - btnH - 18, (canvas.height * 0.68));
        img1 = images.close1;
        img2 = images.close2;
        clicked = window.closeBtnActive;
        let closeBtnImg = clicked && img2 && img2.complete ? img2 : img1 && img1.complete ? img1 : null;
        if (closeBtnImg) {
            ctx.drawImage(closeBtnImg, btnX, btnY, btnW, btnH);
        }
        window.closeBtnRegion = { x: btnX, y: btnY, width: btnW, height: btnH };
        return;
    }
    // Default button size
    btnW = 200;
    btnH = 64;
    // Only affect Next Level button (next_level1 and next_level2)
    if (type === 'nextLevel') {
        // Place at bottom right of the book page, with increased size
        btnX = canvas.width * 0.87 - btnW; // 87% from left, minus button width
        btnY = canvas.height * 0.88 - btnH; // 88% from top, minus button height
    } else if (type === 'retry') {
        btnW *= 3;
        btnH *= 3;
        btnX = (canvas.width - btnW) / 2;
        btnY = (canvas.height - btnH) / 2;
    } else if (type === 'close') {
        btnW = 56;
        btnH = 56;
        btnX = Math.max(18, (canvas.width * 0.275));
        btnY = Math.min(canvas.height - btnH - 18, (canvas.height * 0.68));
    } else {
        btnX = (canvas.width - btnW) / 2;
        btnY = canvas.height - btnH - 20;
    }
    if (type === 'start') {
        img1 = images.start1;
        img2 = images.start2;
        clicked = startClicked;
    } else if (type === 'retry') {
        img1 = images.retry1;
        img2 = images.retry2;
        clicked = retryClicked;
    } else if (type === 'nextLevel') {
        img1 = images.next_level1;
        img2 = images.next_level2;
        clicked = nextLevelClicked;
    }
    if (type === 'nextLevel') {
        if (!clicked && img1 && img1.complete) {
            ctx.drawImage(img1, btnX, btnY, btnW, btnH);
        } else if (clicked && img2 && img2.complete) {
            ctx.drawImage(img2, btnX, btnY, btnW, btnH);
        }
    } else {
        if (!clicked && img1 && img1.complete) {
            ctx.drawImage(img1, btnX, btnY, btnW, btnH);
        } else if (clicked && img2 && img2.complete) {
            ctx.drawImage(img2, btnX, btnY, btnW, btnH);
        }
    }
    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}

// === DRAW WRAPPER
function draw() {
    // === Game Screens
    if (gameState === "title") {
        drawTitleScreen();
        return;
    }
    if (gameState === "settings") {
        // Delegate settings panel drawing to HUD
        if (typeof window.drawSettingsPanel === "function") {
            window.drawSettingsPanel(ctx, canvas, images, { music: window.volumeMusic || 0.7, sfx: window.volumeSFX || 1.0, voices: window.volumeVoices || 1.0 });
        }
        return;
    }
    if (gameState === "gameover") {
        drawGameOverScreen();
        return;
    }
    if (gameState === "levelstart") {
        if (currentLevel === 1) {
            drawChapter1Screen();
        } else if (currentLevel === 2) {
            drawChapter2Screen();
        } else if (currentLevel === 3) {
            drawChapter3Screen();
        } else if (currentLevel === 4) {
            drawChapter4Screen();
        } else if (currentLevel === 5) {
            drawChapter5Screen();
        } else if (currentLevel === 6) {
            drawChapter6Screen();
        } else if (currentLevel === 7) {
            drawChapter7Screen();
        }
        // Draw the next level button
        drawUniversalButton('nextLevel');
        return;
    }
    if (gameState === "gamecomplete") {
        if (currentLevel === 6 || currentLevel === 7) {
            drawCreditsScreen();
            return;
        }
    }

    // === Only draw gameplay/backgrounds if actively playing
    if (gameState === "playing") {
        // Camera follow logic
        const gateStop = levelBounds.right - GAME_WIDTH + 32;
        camera.x = Math.max(0, Math.min(player.x - GAME_WIDTH / 2, gateStop));

        if (currentLevel === 1) {
            drawLevel1Background();
        } else if (currentLevel === 2) {
            drawLevel2Background();
        } else if (currentLevel === 3) {
            drawLevel3Background();
        } else if (currentLevel === 4) {
            drawLevel4Background();
        } else if (currentLevel === 5) {
            drawLevel5Background();
        } else if (currentLevel === 6) {
            drawLevel6Background();
        }     

        // === Gameplay Draw Order
        drawTrophies();
        drawDeadEnemies();
        drawParticles();
        drawPlayer();
        drawEnemies();
        drawProjectiles();
        drawPickups();
            // === Universal Box Shadow / Lens Flare Layer (all levels) ===
            ctx.save();
            ctx.globalAlpha = 0.18;
            // ...no drop shadow...
            // Large soft box shadow for lens flare effect
            ctx.fillStyle = 'rgba(255,255,220,0.10)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            // === Darkness Overlay and Headlamp for Level 4 (drawn above gameplay, below HUD) ===
            if (currentLevel === 4) {
                // Darkness overlay
                ctx.save();
                ctx.globalAlpha = 0.65;
                ctx.fillStyle = "#000";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                // Headlamp effect (additive blend for light)
                if (player && typeof player.x === "number" && typeof player.y === "number") {
                    ctx.save();
                    const headX = player.x - camera.x + (player.width ? player.width / 2 : 24);
                    const headY = player.y + (player.height ? player.height * 0.32 : 26); // Lowered further for level 4
                    const radius = Math.max(220, canvas.width * 0.18);
                    const gradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, radius);
                    gradient.addColorStop(0, "rgba(255,255,240,1)");
                    gradient.addColorStop(0.15, "rgba(255,255,240,0.8)");
                    gradient.addColorStop(0.45, "rgba(255,255,220,0.25)");
                    gradient.addColorStop(1, "rgba(0,0,0,0)");
                    ctx.globalCompositeOperation = "lighter";
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(headX, headY, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = "source-over";
                    ctx.restore();
                }
            }
    window.drawHUD(ctx, canvas, player, images);
    drawSubtitle(ctx, canvas);
            // Show health bars as soon as boss is in view and keep them visible
            const banditLeader = enemies.find(e => e.spriteSet === "bandit_leader" && !e.dead);
            if (banditLeader && enemyInView(banditLeader)) {
                drawBanditLeaderHealth();
            }
            const zombieLord = enemies.find(e => e.spriteSet === "zombie_lord" && !e.dead);
            if (zombieLord && enemyInView(zombieLord)) {
                drawZombieLordHealth();
            }
            const banditLord = enemies.find(e => e.spriteSet === "bandit_lord" && !e.dead);
            if (banditLord && enemyInView(banditLord)) {
                drawBanditLordHealth();
            }
            const hound = enemies.find(e => e.spriteSet === "hound" && !e.dead);
            if (hound && enemyInView(hound)) {
                drawHoundHealth();
            }
    }

    if (gameState === "paused") {
        drawPauseOverlay();
    }
}

// ==============================
// 9. GAME SCREENS & START LOGIC
// ==============================
window.restartLevel = function() {
    // Restarts the current level
    if (typeof currentLevel !== 'undefined') {
        if (currentLevel === 1) startLevel1();
        else if (currentLevel === 2) startLevel2();
        else if (currentLevel === 3) startLevel3();
        else if (currentLevel === 4) startLevel4();
        else if (currentLevel === 5) startLevel5();
        else if (currentLevel === 6) startLevel6();
    }
    retryClicked = false;
};

window.startNextLevel = function() {
    // Advances to the next level, or shows credits after Chapter 7
    if (typeof currentLevel !== 'undefined') {
        if (currentLevel === 1) {
            gameState = 'playing';
            if (typeof startLevel1 === 'function') startLevel1();
        } else if (currentLevel === 2) {
            gameState = 'playing';
            if (typeof startLevel2 === 'function') startLevel2();
        } else if (currentLevel === 3) {
            gameState = 'playing';
            if (typeof startLevel3 === 'function') startLevel3();
        } else if (currentLevel === 4) {
            gameState = 'playing';
            if (typeof startLevel4 === 'function') startLevel4();
        } else if (currentLevel === 5) {
            gameState = 'playing';
            if (typeof startLevel5 === 'function') startLevel5();
        } else if (currentLevel === 6) {
            gameState = 'playing';
        if (typeof startLevel6 === 'function') startLevel6();
            gameState = 'playing';
        if (typeof startLevel7 === 'function') startLevel7();
        } else if (currentLevel === 7) {
            gameState = 'credits';
            if (typeof drawCreditsScreen === 'function') drawCreditsScreen();
        }
    }
    nextLevelClicked = false;
};
// === UNIVERSAL NEXT LEVEL BUTTON DRAWER ===
function drawNextLevelButton() {
    const btnW = 200;
    const btnH = 80;
    const btnX = (canvas.width - btnW) / 2;
    const btnY = (canvas.height - btnH) / 2;
    if (!nextLevelClicked && images.next_level1 && images.next_level1.complete) {
        ctx.drawImage(images.next_level1, btnX, btnY, btnW, btnH);
    } else if (nextLevelClicked && images.next_level2 && images.next_level2.complete) {
        ctx.drawImage(images.next_level2, btnX, btnY, btnW, btnH);
    }
    window.nextLevelButtonBounds = { x: btnX, y: btnY, width: btnW, height: btnH };
}

// === Title Screen ===
function drawTitleScreen() {
    // === Background
    if (images.title) {
        ctx.drawImage(images.title, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // === Start Button
    drawUniversalButton('start');
}

// === Game Over Screen ===
function drawGameOverScreen() {
    // 1) Blur the actual gameplay render (no updates)
    ctx.save();
    ctx.filter = "blur(4px)";

    // Background per level
    if (currentLevel === 1)      drawLevel1Background();
    else if (currentLevel === 2) drawLevel2Background();
    else if (currentLevel === 3) drawLevel3Background();
    else if (currentLevel === 4) drawLevel4Background();
    else if (currentLevel === 5) drawLevel5Background();
    else if (currentLevel === 6) drawLevel6Background();

    drawTrophies();
    drawDeadEnemies();
    drawParticles();
    drawPlayer();
    drawEnemies();
    drawProjectiles();
    drawPickups();
    window.drawHUD(ctx, canvas, player, images);

    ctx.restore();

    // 2) Dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 3) Retry button
    drawUniversalButton('retry');
}

function drawChapter1Screen() {
    if (images.chapter1) {
        ctx.drawImage(images.chapter1, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter2Screen() {
    if (images.chapter2) {
        ctx.drawImage(images.chapter2, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter3Screen() {
    if (images.chapter3) {
        ctx.drawImage(images.chapter3, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter4Screen() {
    if (images.chapter4) {
        ctx.drawImage(images.chapter4, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter5Screen() {
    if (images.chapter5) {
        ctx.drawImage(images.chapter5, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter6Screen() {
    if (images.chapter6) {
        ctx.drawImage(images.chapter6, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawChapter7Screen() {
    if (images.chapter7) {
        ctx.drawImage(images.chapter7, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    drawUniversalButton('nextLevel');
}

function drawCreditsScreen() {
    if (images.credits) {
        ctx.drawImage(images.credits, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
}

// === Chapter Screen Buttons ===
function drawChapterScreenButton(text = "Next Level", onClick = null) {
    const buttonWidth = 200;
    const buttonHeight = 80;
    const startX = (canvas.width - buttonWidth) / 2;
    const startY = canvas.height - buttonHeight - 50;
    
    // Draw button background
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#222";
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(startX, startY, buttonWidth, buttonHeight, 18);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    
    // Draw button text
    ctx.fillStyle = "white";
    ctx.font = "32px Arial Black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, startX + buttonWidth / 2, startY + buttonHeight / 2);
    ctx.restore();
    
    // Register button bounds for click detection
    window.nextLevelButtonBounds = { x: startX, y: startY, width: buttonWidth, height: buttonHeight, onClick };
}

    // SUBTITLE SYSTEM
    let subtitleText = "";
    let subtitleTimer = 0;
    function showSubtitle(text, duration = 350) {
    subtitleText = text;
    subtitleTimer = duration;
}

function drawSubtitle(ctx, canvas) {
    if (subtitleText && subtitleTimer > 0) {
        ctx.save();
        ctx.font = "bold 32px Arial";
        ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(canvas.width/2 - 340, canvas.height - 120, 680, 54);
        ctx.fillStyle = "#FFD700";
        ctx.fillText(subtitleText, canvas.width/2, canvas.height - 80);
        ctx.restore();
    }
}

// ==============================
// 10. GAME ENTITIES
// ==============================
// === PICKUP SPAWN HELPERS ===
function spawnCoin(x, y) {
    let offset = 32; // pixels to the right for visibility
    let coinX = player.x + player.width + offset;
    let coinY = player.y + player.height - 25; // bottom of coin aligns with Quinn's feet
    coins.push({ x: coinX, y: coinY, width: 25, height: 25, spriteSet: "coin", value: 1, spawnFrame: frame, life: 2000 });
}

function spawnHeart(x, y) {
    let offset = 32; // pixels to the right for visibility
    let heartX = player.x + player.width + offset;
    let heartY = player.y + player.height - 30; // bottom of heart aligns with Quinn's feet
    hearts.push({ x: heartX, y: heartY, width: 30, height: 30, spriteSet: "heart", value: 1, spawnFrame: frame, life: 2000 });
}

// === COLLISION & PARTICLES ===
function checkCollision(a, b, padding = 0) {
    if (!a || !b) return false;
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

// ==============================
// CHAPTER SCREEN LOGIC
// ==============================
function showChapterScreen(chapterNum) {
    stopAllSounds();
    playSound("title", window.volumeMusic);
    gameState = "levelstart";

    // Common chapter screen logic
    const chapterImage = images[`chapter${chapterNum}`];
    if (chapterImage) {
        ctx.drawImage(chapterImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Chapter-specific logic
    if (chapterNum === 1) {
        // Additional effects or sounds for Chapter 1
    } else if (chapterNum === 2) {
        // Additional effects or sounds for Chapter 2
    } else if (chapterNum === 3) {
        // Additional effects or sounds for Chapter 3
    } else if (chapterNum === 4) {
        // Additional effects or sounds for Chapter 4
    } else if (chapterNum === 5) {
        // Additional effects or sounds for Chapter 5
    } else if (chapterNum === 6) {
        // Additional effects or sounds for Chapter 6
    } else if (chapterNum === 7) {
        // Additional effects or sounds for Chapter 7
    }

    // Draw the next level button
    drawUniversalButton('nextLevel');

    // Handle button click to start the level
    window.nextLevelButtonClicked = function() {
        stopAllSounds();
        if (chapterNum === 1) {
            startLevel1();
        } else if (chapterNum === 2) {
            startLevel2();
        } else if (chapterNum === 3) {
            startLevel3();
        } else if (chapterNum === 4) {
            startLevel4();
        } else if (chapterNum === 5) {
            startLevel5();
        } else if (chapterNum === 6) {
            startLevel6();
        } else if (chapterNum === 7) {
            // Always show credits screen and set gameState
            gameState = 'credits';
            if (typeof drawCreditsScreen === 'function') drawCreditsScreen();
        }
        nextLevelClicked = false;
    };
}