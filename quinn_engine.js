// ==============================
// QUINN'S QUEST ENGINE
// TABLE OF CONTENTS
// ==============================
//  1. Core Engine & Globals
//  2. Asset Loading & Initialization
//  3. Game State Management
//  4. Audio System
//  5. Input Handling
//  6. Particle System
//  7. Pickup System
//  8. Gameplay Rendering
//  9. UI Rendering
//  10. UI Interaction
//  11. Utility Interactions
//  12. Main Loop


// ==============================
// 1. CORE ENGINE & GLOBALS
// ==============================

// === PRIORITY RULES ===
let activeSounds = [];                    // tracks currently playing sounds for management

// === CANVAS SETUP ===
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

// dynamic resize handler for responsive game scaling
function resizeCanvas() {
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}
window.addEventListener("resize", resizeCanvas); // resizes canvas on browser window change

// === GAME DIMENSIONS ===
let GAME_WIDTH = window.innerWidth;       // dynamic game width based on browser viewport
let GAME_HEIGHT = window.innerHeight;     // dynamic game height based on browser viewport
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// === GLOBAL CONSTANTS ===
const GRAVITY = 1;                         // downward force applied to entities
const FRICTION = 0.9;                      // velocity reduction on ground contact
const GROUND_HEIGHT = 65;                  // ground thickness in pixels
const CAMERA_SHAKE_DEFAULT = 5;            // default shake magnitude in pixels
const FPS_LIMIT = 60;                      // frame rate cap for consistent pacing

// === UI STATE FLAGS ===
let gameState = "title";                   // current UI/game mode
let lastGameState = "title";               // previous state for resuming logic
let currentLevel = 1;                      // active level (default start at L1)
let nextLevelTransitionTimer = 0;          // countdown for transitioning between levels
let bossIntroTriggered = false;            // tracks if boss intro scene has started
let bossCutsceneActive = false;            // locks gameplay while cutscene runs
let coinCount = 0;                         // total coins collected (all levels)
let startClicked = false;                  // prevents multi-trigger on start button
let titleMusicPlayed = false;              // ensures title music only plays once
let nextLevelClicked = false;              // prevents multi-trigger on next level button

// === AUDIO SETTINGS & UI SLIDERS ===
let muted = false;                         // global mute toggle (used by playSound)
let currentMusic = null;                   // reference to currently playing music
let volumeMusic = 0.7;                     // background music volume
let volumeSFX = 1.0;                        // sound effects volume
let volumeVoices = 1.0;                     // voice lines volume

// === OBJECT COLLISIONS ===
let images = {};                           // loaded sprite assets
let sounds = {};                           // loaded audio assets
let keys = {};                             // keyboard state map
let player = null;                         // player entity reference
let levelBounds = { left: 0, right: 5000 }; // active level boundaries, updated on level load

// === CAMERA & FRAME COUNTER ===
let camera = { x: 0, y: 0 };               // camera position in world space
let frame = 0;                             // global frame counter
let shakeTimer = 0;                        // remaining frames of camera shake
let cameraShakeAmount = CAMERA_SHAKE_DEFAULT; // current shake magnitude in pixels

// === TIME DELTA SUPPORT ===
let lastTime = 0;                          // last frame's timestamp
let deltaTime = 0;                         // time since last frame in ms

// === CAMERA SHAKE HELPER ===
// Returns the current shake offset to apply to drawing routines.
// This ensures that all background, road, and foreground draw calls
// can incorporate shake consistently (dx, dy applied in render).
function getCameraShakeOffset() {
    if (shakeTimer > 0) {
        const dx = (Math.random() * 2 - 1) * cameraShakeAmount; // horizontal offset
        const dy = (Math.random() * 2 - 1) * cameraShakeAmount; // vertical offset
        return { dx, dy };
    }
    return { dx: 0, dy: 0 }; // no shake offset
}

// === TRIGGER CAMERA SHAKE ===
function triggerCameraShake(frames, amount = CAMERA_SHAKE_DEFAULT) {
    shakeTimer = frames;                   // duration of shake in frames
    cameraShakeAmount = amount;            // magnitude of shake in pixels
}

// === APPLY CAMERA SHAKE ===
function applyCameraShake() {
    if (shakeTimer > 0) {
        shakeTimer--;                       // decrease remaining shake duration
        if (shakeTimer <= 0) {
            cameraShakeAmount = CAMERA_SHAKE_DEFAULT; // reset to default magnitude
        }
    }
}


// ==============================
// 2. ASSET LOADING & INITIALIZATION
// ==============================

// === ASSET COUNTERS ===
let assetsToLoad = 0;                       // total number of assets expected
let assetsLoaded = 0;                       // total number of assets fully loaded
let trimmedSprites = {};                    // cache for pre-trimmed sprites

// === PREPROCESS SPRITE ===
// trims transparency once and caches the result for faster rendering
function preprocessSprite(key, img) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.clearRect(0, 0, img.width, img.height);
    tempCtx.drawImage(img, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 50) { // alpha cutoff = 50 for transparency
            data[i + 3] = 0;
        }
    }
    tempCtx.putImageData(imageData, 0, 0);

    trimmedSprites[key] = tempCanvas; // store processed version
}

// === IMAGE LOADER ===
function loadImage(key, src) {
    assetsToLoad++;
    const img = new Image();
    img.src = src;
    img.onload = () => {
        preprocessSprite(key, img);        // trim and cache once
        assetsLoaded++;
    };
    img.onerror = () => {
        console.error(`❌ Image failed to load: ${src}`);
        assetsLoaded++;
    };
    images[key] = img;
}

// === SOUND LOADER ===
function loadSound(key, src) {
    assetsToLoad++;
    const audio = new Audio();
    audio.src = src;
    audio.oncanplaythrough = () => { assetsLoaded++; };
    audio.onerror = () => {
        console.error(`❌ Sound failed to load: ${src}`);
        assetsLoaded++;
    };
    sounds[key] = audio;
}

// === JSON ASSET-MAP LOADER ===
function loadAssetsFromJSON(manifest, callback) {

// === LOAD IMAGES ===
    if (manifest.images) {
        for (const [key, src] of Object.entries(manifest.images)) {
            loadImage(key, src);
        }
    }

// === LOAD SOUNDS ===
    if (manifest.sounds) {
        for (const [key, src] of Object.entries(manifest.sounds)) {
            loadSound(key, src);
        }
    }

// === WAIT UNTIL ALL ASSETS LOADED ===
    const checkAssetsLoaded = setInterval(() => {
        if (assetsLoaded >= assetsToLoad) {
            clearInterval(checkAssetsLoaded);
            callback();
        }
    }, 50);
}

// === GAME INITIALIZATION ===
function initGame() {
    console.log("✅ All assets loaded. Initializing game...");

// === CORE SYSTEMS ===
    initInput();
    initUIEventHandlers();
    initPlayer();
    initEnemies();
    initPickups();
    initParticles();

// === SET DEFAULT STATE ===
    gameState = "title";
    lastGameState = gameState;
    frame = 0;

// === INITIAL DRAW ===
    draw();
}

// === BOOT SEQUENCE ===
loadAssetsFromJSON(assetManifest, () => {
    initGame();
    requestAnimationFrame(gameLoop);
});


// ==============================
// 3. GAME STATE MANAGEMENT
// ==============================

// === GAME STATE REFERENCE ===
// "title"        – title screen (main menu, waits for player to start)
// "playing"      – active gameplay; updates player, enemies, projectiles, etc.
// "levelstart"   – end-of-level results screen before next stage
// "gameover"     – player death screen (retry or quit options)
// "gamecomplete" – final completion/victory screen after last level
// "paused"       – pause menu overlay (blurred background)
// "settings"     – settings menu overlay (blurred background)

// === START GAME ===
function startGame() {
    stopAllSounds();
    playSound("title", volumeMusic);
    gameState = "title";
    resizeCanvas();
    requestAnimationFrame(gameLoop);
}

// === RESET GAME STATE ===
// clears persistent variables so restarts are clean
function resetGameState() {
    coinCount = 0;                     // reset coin count
    nextLevelClicked = false;          // reset next-level click state
    startClicked = false;              // reset start click state
    bossIntroTriggered = false;        // reset boss intro trigger
    bossCutsceneActive = false;        // reset boss cutscene lock
    uiLock = false;                     // unlock UI
    pickups = [];                       // clear pickups array
    projectiles = [];                   // clear active projectiles
    enemies = [];                       // clear active enemies
    particles = [];                     // clear active particles
    frame = 0;                          // reset frame counter
    shakeTimer = 0;                     // clear camera shake
    camera = { x: 0, y: 0 };            // reset camera position
}

// === RESTART GAME ===
function restartGame() {
    stopAllSounds();
    resetGameState();                   // ensure clean state
    titleMusicPlayed = false;           // allow title music to replay

    if (currentLevel === 1)      startLevel1();
    else if (currentLevel === 2) startLevel2();
    else if (currentLevel === 3) startLevel3();
    else if (currentLevel === 4) startLevel4();
}

// === BOSS INTRO CUTSCENE HANDLER ===
// freezes gameplay until both boss intro sound and Quinn's response finish playing
function triggerBossIntro(bossType) {
    bossIntroTriggered = true;
    bossCutsceneActive = true;
    stopAllSounds();

    const bossSound = bossType === "zombie_lord" ? "zombie_lord" : "bandit_leader";
    const quinnResponse = bossType === "zombie_lord" ? "quinn_zombie" : "quinn2";

    // Play boss sound first
    playSound(bossSound, volumeVoices);

    // Wait for boss sound to finish, then play Quinn's response
    const bossDuration = sounds[bossSound] ? sounds[bossSound].duration * 1000 : 2000;
    setTimeout(() => {
        playSound(quinnResponse, volumeVoices);

        // Wait for Quinn's line to finish, then resume gameplay
        const quinnDuration = sounds[quinnResponse] ? sounds[quinnResponse].duration * 1000 : 2000;
        setTimeout(() => {
            bossCutsceneActive = false; // unlock gameplay
        }, quinnDuration);

    }, bossDuration);
}

// === GLOBAL BACKGROUND DRAW WRAPPER ===
// ensures Section 8 draw() can call this regardless of current level
function drawBackground() {
    if (currentLevel === 1 && typeof drawLevel1Background === "function") {
        drawLevel1Background();
    } else if (currentLevel === 2 && typeof drawLevel2Background === "function") {
        drawLevel2Background();
    } else if (currentLevel === 3 && typeof drawLevel3Background === "function") {
        drawLevel3Background();
    } else if (currentLevel === 4 && typeof drawLevel4Background === "function") {
        drawLevel4Background();
    }
}


// ==============================
// 4. AUDIO SYSTEM
// ==============================
//
// Handles all in-game audio playback, including:
// - sound effects
// - background music
// - stopping all active audio
//
// depends on: muted, sounds, activeSounds, currentMusic
//

// === MAXIMUM CONCURRENT SOUNDS ===
const MAX_ACTIVE_SOUNDS = 20; // hard cap to avoid audio overload

// === PLAY A SOUND OR MUSIC TRACK ===
function playSound(name, volume = 1.0) {
    // skip if muted or asset missing
    if (muted || !sounds[name]) return;

    try {
        // enforce active sound channel limit
        if (activeSounds.length >= MAX_ACTIVE_SOUNDS) {
            const oldest = activeSounds.shift();
            if (oldest) {
                oldest.pause();
                oldest.currentTime = 0;
            }
        }

        // clone node to allow overlapping SFX playback
        const sound = sounds[name].cloneNode();
        sound.volume = volume;

        // track active sounds for later stopping
        activeSounds.push(sound);
        sound.onended = () => {
            activeSounds = activeSounds.filter(s => s !== sound);
        };

        // replace current background music if this is a music track
        if (["title", "background1", "background2", "background3", "background4", "win", "lose"].includes(name)) {
            if (currentMusic) {
                try {
                    currentMusic.pause();
                    currentMusic.currentTime = 0;
                } catch (e) {
                    console.warn("⚠️ Failed to stop previous music:", e);
                }
            }
            currentMusic = sound;
        }

        sound.play().catch(err => {
            console.warn(`⚠️ Failed to play sound '${name}':`, err);
        });
    } catch (e) {
        console.error(`❌ Audio error for '${name}':`, e);
    }
}

// === STOP ALL CURRENTLY PLAYING SOUNDS AND MUSIC ===
function stopAllSounds() {
    // stop and reset all active sound effects
    for (const s of activeSounds) {
        try {
            s.pause();
            s.currentTime = 0;
        } catch (e) {
            console.warn("⚠️ Failed to stop sound:", e);
        }
    }
    activeSounds = [];

    // stop and reset background music
    if (currentMusic) {
        try {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        } catch (e) {
            console.warn("⚠️ Failed to stop music:", e);
        }
        currentMusic = null;
    }
}

// === GAME OVER MUSIC CUE ===
// plays lose.mp3 at correct volume after stopping all other sounds
function playGameOverMusic() {
    stopAllSounds();
    playSound("lose", volumeMusic);
}


// ==============================
// 5. INPUT HANDLING
// ==============================

let uiLock = false; // prevents spam clicking on UI buttons

// === UNIFIED CANVAS CLICK HANDLER (menus, buttons, sliders)
canvas.addEventListener("click", evt => {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;  // click X in canvas space
    const y = evt.clientY - rect.top;   // click Y in canvas space

    // === SETTINGS PANEL ===
    if (gameState === "settings") {
        const changed =
            handleSliderClick(x, y, 210, v => volumeMusic = v) |
            handleSliderClick(x, y, 290, v => volumeSFX = v) |
            handleSliderClick(x, y, 370, v => volumeVoices = v);
        if (changed) playSound("click", volumeSFX);
        return;
    }

    // === TITLE SCREEN (start1 → start2) ===
    if (gameState === "title") {
        const buttonWidth = 200;
        const buttonHeight = 80;
        const btnX = (canvas.width - buttonWidth) / 2;
        const btnY = canvas.height - buttonHeight - 20;
        if (x >= btnX && x <= btnX + buttonWidth &&
            y >= btnY && y <= btnY + buttonHeight) {
            if (!uiLock) {
                uiLock = true;
                images.start_button = images.start2; // swap to pressed version
                playSound("click", volumeSFX);
                setTimeout(() => { startLevel1(); uiLock = false; }, 150);
            }
        }
        return;
    }

    // === GAME OVER SCREEN (retry1 → retry2) ===
    if (gameState === "gameover") {
        const bounds = window.nextLevelButtonBounds;
        if (bounds &&
            x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height) {
            if (!uiLock) {
                uiLock = true;
                images.retry_button = images.retry2; // swap to pressed version
                playSound("click", volumeSFX);
                setTimeout(() => {
                    stopAllSounds();
                    if (currentLevel === 1) startLevel1();
                    else if (currentLevel === 2) startLevel2();
                    else if (currentLevel === 3) startLevel3();
                    else if (currentLevel === 4) startLevel4();
                    uiLock = false;
                }, 150);
            }
        }
        return;
    }

    // === LEVEL START SCREENS (next_level1 → next_level2) ===
    if (gameState === "levelstart") {
        const bounds = window.nextLevelButtonBounds;
        if (bounds &&
            x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height) {
            if (!uiLock) {
                uiLock = true;
                images.next_level_button = images.next_level2; // swap to pressed version
                playSound("click", volumeSFX);
                setTimeout(() => {
                    if (currentLevel === 1) startLevel2();
                    else if (currentLevel === 2) startLevel3();
                    else if (currentLevel === 3) startLevel4();
                    uiLock = false;
                }, 150);
            }
        }
        return;
    }
});

// === KEYBOARD INPUT HANDLING ===
// separates jump (ArrowUp/Space) from block (Shift/Control)
window.addEventListener("keydown", e => {
    keys[e.key] = true;

    if (gameState === "playing" && !player.dead && !bossCutsceneActive) {
        // Jump: ArrowUp or Space
        if ((e.key === "ArrowUp" || e.key === " ") && player.onGround) {
            player.vy = -15;
            playSound("jump", volumeSFX);
        }
        // Block: Shift or Control
        if (e.key === "Shift" || e.key === "Control") {
            player.isBlocking = true;
        }
    }
});

window.addEventListener("keyup", e => {
    keys[e.key] = false;

    if (e.key === "Shift" || e.key === "Control") {
        player.isBlocking = false;
    }
});


// ==============================
// 6. PARTICLE SYSTEM
// ==============================

// === PARTICLE STORAGE ===
let particles = [];                      // active particle list
let particlePool = [];                   // reusable particles to reduce GC churn

// === SPAWN A GROUP OF PARTICLES AT A POSITION ===
// type = string identifier for particle type
// x, y = spawn position
// count = number of particles to spawn
// speed = base movement speed
// lifetime = lifetime in frames
function spawnParticles(type, x, y, count = 5, speed = 2, lifetime = 30) {
    // adjust counts/offsets to match backup engine
    // hit = red blood, block = white sparks, dead = larger burst
    if (type === "hit") {
        count = 12; // backup used higher count for melee hits
        y -= 10;    // slight upward offset so particles appear from impact
    } else if (type === "block") {
        count = 8;  // backup used more sparks for visual feedback
        y -= 15;    // sparks appear slightly higher
    } else if (type === "dead") {
        count = 20; // bigger burst for death
        y -= 20;    // high offset to center burst around upper body
    }

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.5 + Math.random() * 0.5);
        let p;

        // reuse from pool if available
        if (particlePool.length > 0) {
            p = particlePool.pop();
        } else {
            p = {}; // create new object if pool empty
        }

        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * velocity;
        p.vy = Math.sin(angle) * velocity;
        p.life = lifetime;
        p.maxLife = lifetime;
        p.type = type;

        particles.push(p);
    }
}

// === UPDATE PARTICLE POSITIONS AND REMOVE EXPIRED ONES ===
// dt = delta time multiplier
function updateParticles(dt) {
    const camLeft = camera.x - 100;                          // left cull margin
    const camRight = camera.x + GAME_WIDTH + 100;            // right cull margin
    const camTop = -100;                                     // top cull margin
    const camBottom = GAME_HEIGHT + 100;                     // bottom cull margin

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // skip off-screen updates
        if (p.x < camLeft || p.x > camRight || p.y < camTop || p.y > camBottom) {
            particlePool.push(particles.splice(i, 1)[0]);    // recycle particle
            continue;
        }

        // apply movement
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // apply gravity for certain types
        if (p.type === "hit" || p.type === "dead" || p.type === "dust") {
            p.vy += 0.15 * dt;                               // mild downward drift
        } else if (p.type === "block") {
            p.vy -= 0.05 * dt;                               // sparks drift slightly upward
        }

        // fade out over lifetime
        p.life -= dt;
        if (p.life <= 0) {
            particlePool.push(particles.splice(i, 1)[0]);    // recycle particle
        }
    }
}

// === RENDER ALL ACTIVE PARTICLES ===
function drawParticles() {
    const camLeft = camera.x - 100;                          // left cull margin
    const camRight = camera.x + GAME_WIDTH + 100;            // right cull margin
    const camTop = -100;                                     // top cull margin
    const camBottom = GAME_HEIGHT + 100;                     // bottom cull margin

    for (let p of particles) {

        // skip draw if off-screen
        if (p.x < camLeft || p.x > camRight || p.y < camTop || p.y > camBottom) continue;

        // pick color by type
        if (p.type === "hit") ctx.fillStyle = "rgba(255,0,0,0.8)";
        else if (p.type === "block") ctx.fillStyle = "rgba(255,255,255,0.85)";
        else if (p.type === "dead") ctx.fillStyle = "rgba(139,0,0,0.85)";
        else if (p.type === "dust") ctx.fillStyle = "rgba(200,200,200,0.6)";
        else ctx.fillStyle = "rgba(128,128,128,0.8)";

        // remaining life fade size
        const size = 2 + 2.5 * (p.life / p.maxLife);

        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}


// ==============================
// 7. PICKUP SYSTEM
// ==============================

// === PICKUP STORAGE ===
let coins = [];            // holds all coin pickups
let hearts = [];           // holds all heart pickups
let itemTrophies = [];     // holds all quest/collectible trophies (keys, scrolls, gems, etc.)

// === SPAWN COIN ===
function spawnCoin(x, y) {
    coins.push({
        x, y,
        width: 32,
        height: 32,
        spawnFrame: frame,
        type: "coin"
    });
}

// === SPAWN HEART ===
function spawnHeart(x, y) {
    hearts.push({
        x, y,
        width: 32,
        height: 32,
        spawnFrame: frame,
        type: "heart"
    });
}

// === SPAWN ITEM TROPHY ===
// type = "key", "scroll", "gem", etc.
function spawnItemTrophy(type, x, y) {
    itemTrophies.push({
        x, y,
        width: 32,
        height: 32,
        spawnFrame: frame,
        type: type
    });
}

// === CLEAR PICKUPS (LEVEL RESET) ===
// clears all pickup arrays to prevent persistence between levels
function clearAllPickups() {
    coins = [];
    hearts = [];
    itemTrophies = [];
}

// === UPDATE PICKUPS (DESPAWN LOGIC) ===
function updatePickups(dt) {
    const DESPAWN_TIME = 60 * 60; // 60 seconds at 60fps

    // coins
    coins = coins.filter(p => frame - p.spawnFrame < DESPAWN_TIME);

    // hearts
    hearts = hearts.filter(p => frame - p.spawnFrame < DESPAWN_TIME);

    // item trophies
    itemTrophies = itemTrophies.filter(p => frame - p.spawnFrame < DESPAWN_TIME);
}

// === DRAW PICKUPS ===
function drawPickups() {

    // coins
    for (let coin of coins) {
        const bounce = Math.sin((frame - coin.spawnFrame) / 5) * 5; // bounce motion
        const angle = ((frame - coin.spawnFrame) % 360) * 0.05;     // spin rotation
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

    // hearts
    for (let heart of hearts) {
        const bounce = Math.sin((frame - heart.spawnFrame) / 5) * 5; // bounce motion
        if (images.heart) {
            ctx.drawImage(images.heart, heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(heart.x - camera.x, heart.y + bounce, heart.width, heart.height);
        }
    }

    // item trophies
    for (let item of itemTrophies) {
        const bounce = Math.sin((frame - item.spawnFrame) / 5) * 5; // bounce motion
        const angle = ((frame - item.spawnFrame) % 360) * 0.05;     // spin rotation

        // sprite lookup
        let sprite = null;
        if (item.type === "key" && images.key) sprite = images.key;
        else if (item.type === "scroll" && images.magic_scroll) sprite = images.magic_scroll;
        else if (item.type === "gem" && images.gem) sprite = images.gem;

        if (sprite) {
            ctx.save();
            ctx.translate(item.x - camera.x + item.width / 2, item.y + bounce + item.height / 2);
            ctx.rotate(angle);
            ctx.drawImage(sprite, -item.width / 2, -item.height / 2, item.width, item.height);
            ctx.restore();
        } else {
            ctx.fillStyle = "purple"; // fallback color
            ctx.fillRect(item.x - camera.x, item.y + bounce, item.width, item.height);
        }
    }
}


// ==============================
// 8. GAMEPLAY RENDERING
// ==============================

// === SPRITE CACHE ===
const trimmedSpriteCache = {}; // stores pre-trimmed canvases by original image src

// === SPRITE UTILITY ===
// pre-trims an image on first use and caches the processed result
function drawTrimmedSprite(img, x, y, width, height, facing = "right", glow = null) {
    if (!img) return;

    // cache: trimmed sprite first use
    if (!trimmedSpriteCache[img.src]) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.drawImage(img, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 50) data[i + 3] = 0; // alpha cutoff = 50 for transparency
        }
        tempCtx.putImageData(imageData, 0, 0);
        trimmedSpriteCache[img.src] = tempCanvas;
    }

    const finalImage = trimmedSpriteCache[img.src];

    // glow & drop shadow
    if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
    } else {
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }

    ctx.save();
    if (facing === "left") {
        ctx.scale(-1, 1);
        ctx.drawImage(finalImage, -x - width, y, width, height);
    } else {
        ctx.drawImage(finalImage, x, y, width, height);
    }
    ctx.restore();
    ctx.shadowColor = "transparent";
}

// === PLAYER RENDERING ===
function drawPlayer() {
    if (!player) return;

    let sprite = null;
    let yOffset = 0;
    const STANDING_OFFSET = 30;

    if (player.dead && images.quinn_dead) {
        sprite = images.quinn_dead;
        yOffset = 80;
    } else if (player.castingMagic && images.quinn_casting) {
        sprite = images.quinn_casting;
    } else if ((player.attackTimer > 0 || player.isAttacking) && images.quinn_slash) {
        sprite = images.quinn_slash;
    } else if (player.isBlocking && images.quinn_block) {
        sprite = images.quinn_block;
        yOffset = -28;
    } else if (Math.abs(player.vx) > 1) {
        const haveRun123 = images.quinn_run1 && images.quinn_run2 && images.quinn_run3;
        if (haveRun123) {
            const RUN_CYCLE_FRAMES = 40;
            const RUN_STEP_FRAMES = 10;
            const step = Math.floor((frame % RUN_CYCLE_FRAMES) / RUN_STEP_FRAMES);
            const runSeq = [images.quinn_run1, images.quinn_run2, images.quinn_run3, images.quinn_run2];
            sprite = runSeq[step];
        } else if (images.quinn_run1 && images.quinn_run2) {
            sprite = (frame % 20 < 10) ? images.quinn_run1 : images.quinn_run2;
        }
    } else if (images.quinn_idle) {
        sprite = images.quinn_idle;
    }

    if (sprite) {
        // glow logic — only actual block events set blue glow
        let glowColor = null;
        if (player.invincible) glowColor = "yellow";
        else if (player.hitFlash > 0) glowColor = "red";
        else if (player.glow) glowColor = player.glow;

        drawTrimmedSprite(
            sprite,
            player.x - camera.x,
            player.y + (player.dead ? yOffset : STANDING_OFFSET + yOffset),
            sprite.width,
            sprite.height,
            player.facing,
            glowColor
        );
    }
}

// === ENEMY RENDERING ===
function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy || !images[enemy.spriteSet + "_" + enemy.sprite]) continue;

        let glowColor = null;
        if (enemy.hitFlash > 0) glowColor = "red";
        else if (enemy.glow) glowColor = enemy.glow;

        // dead sprite offsets fix for certain enemies
        let yOffset = 0;
        if (enemy.dead) {
            if (enemy.spriteSet === "bandit") yOffset = 10;      // aligns bandit death pose
            else if (enemy.spriteSet === "goblin") yOffset = 8;  // aligns goblin death pose
        }

        drawTrimmedSprite(
            images[enemy.spriteSet + "_" + enemy.sprite],
            enemy.x - camera.x,
            enemy.y + yOffset,
            enemy.width,
            enemy.height,
            enemy.facing,
            glowColor
        );
    }
}

// === PROJECTILE RENDERING ===
function drawProjectiles() {
    for (let p of projectiles) {
        const imgKey = p.type;
        if (images[imgKey]) {
            ctx.drawImage(images[imgKey], p.x - camera.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = "orange";
            ctx.fillRect(p.x - camera.x, p.y, p.width, p.height);
        }
    }
}

// === MASTER DRAW (Z-LAYERED) ===
// order: background → pickups → enemies → player → projectiles → particles → HUD
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();       // farthest back
    drawPickups();          // under entities
    drawEnemies();          // behind player
    drawPlayer();           // main focus
    drawProjectiles();      // above player/enemies
    drawParticles();        // above projectiles
    drawHUD();              // always top layer
}


// ==============================
// 9. UI RENDERING
// ==============================

function drawHUD() {
    if (!player) return;

    // responsive HUD anchor
    const hudScale = Math.max(1, canvas.width / 1920); // scale HUD based on resolution
    const hudX = 20 * hudScale; // hud anchor x
    const hudY = 20 * hudScale; // hud anchor y
    const heartSpacing = 34 * hudScale; // responsive spacing
    const heartSize = 32 * hudScale;    // responsive size

    // hearts backplate — matches backup alignment for 2 rows of 5 hearts
    if (images.hud_health) {
        const backplateWidth = (heartSpacing * 5) + 12 * hudScale; // enough for 5 hearts
        const backplateHeight = (heartSpacing * 2) + 12 * hudScale; // enough for 2 rows
        ctx.drawImage(
            images.hud_health,
            hudX - 6 * hudScale, // small padding offset to match backup
            hudY - 6 * hudScale,
            backplateWidth,
            backplateHeight
        );
    }

    // hearts
    for (let i = 0; i < player.maxHealth; i++) {
        const row = Math.floor(i / 5); // 5 hearts per row
        const col = i % 5;
        const heartX = hudX + col * heartSpacing;
        const heartY = hudY + row * heartSpacing;

        if (i < player.health) {
            ctx.drawImage(images.heart, heartX, heartY, heartSize, heartSize);
        } else {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(images.heart, heartX, heartY, heartSize, heartSize);
            ctx.globalAlpha = 1.0;
        }
    }

    // coins — backup positions coin icon directly below hearts with consistent spacing
    if (images.coin) {
        const coinY = hudY + (heartSpacing * 2) + 8 * hudScale; // just below hearts backplate
        ctx.drawImage(images.coin, hudX, coinY, 32 * hudScale, 32 * hudScale);
        ctx.fillStyle = "white";
        ctx.font = `${Math.floor(24 * hudScale)}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText(player.coins, hudX + 40 * hudScale, coinY + 24 * hudScale);
    }

    // magic meter — unchanged from modular
    if (typeof player.magicCooldown === "number" && player.magicCooldownMax) {
        const barX = hudX;
        const barY = hudY + (heartSpacing * 2) + 48 * hudScale;
        const barWidth = 120 * hudScale;
        const barHeight = 16 * hudScale;
        const fillRatio = 1 - (player.magicCooldown / player.magicCooldownMax);

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // background
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "blue"; // fill
        ctx.fillRect(barX, barY, barWidth * fillRatio, barHeight);

        ctx.strokeStyle = "white"; // border
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// === TITLE SCREEN ===
function drawTitleScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = `${Math.floor(canvas.width / 20)}px Arial`; // scale with resolution
    ctx.textAlign = "center";
    ctx.fillText("Legend of Quinn", canvas.width / 2, canvas.height / 4);

    if (images.start_button) {
        const btnWidth = 200;
        const btnHeight = 80;
        ctx.drawImage(images.start_button, canvas.width / 2 - btnWidth / 2, canvas.height / 2, btnWidth, btnHeight);
    }
}

// === GAME OVER SCREEN ===
function drawGameOverScreen() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = `${Math.floor(canvas.width / 20)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 3);
}


// ==============================
// 10. UI INTERACTION
// ==============================

// === UI STATE TRACKING ===
let hoveredButton = null;  // current button under mouse
let activeButton = null;   // button pressed down

// === BUTTON DEFINITIONS ===
const uiButtons = {
    title: [
        { id: "start",    x: () => canvas.width / 2 - 100, y: () => 300, w: 200, h: 80, click: () => startLevel1() }
    ],
    end: [
        { id: "next",     x: () => canvas.width / 2 - 100, y: () => 300, w: 200, h: 80, click: () => {
            if (currentLevel === 1) startLevel2();
            else if (currentLevel === 2) startLevel3();
            else if (currentLevel === 3) startLevel4();
            else console.log("No further levels implemented yet.");
        }}
    ],
    gameover: [
        { id: "retry",    x: () => canvas.width / 2 - 100, y: () => 300, w: 200, h: 80, click: () => {
            if (currentLevel === 1) startLevel1();
            else if (currentLevel === 2) startLevel2();
            else if (currentLevel === 3) startLevel3();
            else if (currentLevel === 4) startLevel4();
        }}
    ],
    settings: [
        { id: "musicSlider",  type: "slider", y: 210, onChange: v => volumeMusic = v },
        { id: "sfxSlider",    type: "slider", y: 290, onChange: v => volumeSFX = v },
        { id: "voiceSlider",  type: "slider", y: 370, onChange: v => volumeVoices = v }
    ]
};

// === MOUSE CLICK: DIRECT TRIGGER HANDLING ===
// bypasses hover requirement so any click inside button area triggers immediately
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const group = uiButtons[gameState];
    if (!group) return;

    let clicked = false;
    for (let btn of group) {
        if (btn.type === "slider") continue;
        const bx = typeof btn.x === "function" ? btn.x() : btn.x;
        const by = typeof btn.y === "function" ? btn.y() : btn.y;
        if (mx >= bx && mx <= bx + btn.w && my >= by && my <= by + btn.h) {
            playSound("click", volumeSFX);
            btn.click();
            clicked = true;
            break;
        }
    }

    // === SETTINGS SLIDER HANDLING ===
    if (!clicked && gameState === "settings") {
        for (let btn of uiButtons.settings) {
            if (btn.type === "slider") {
                handleSliderClick(mx, my, btn.y, btn.onChange);
            }
        }
    }
});

// === MOUSE MOVE: HOVER DETECTION ===
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredButton = null;

    const group = uiButtons[gameState];
    if (!group) return;

    for (let btn of group) {
        if (btn.type === "slider") continue;
        const bx = typeof btn.x === "function" ? btn.x() : btn.x;
        const by = typeof btn.y === "function" ? btn.y() : btn.y;
        if (mx >= bx && mx <= bx + btn.w && my >= by && my <= by + btn.h) {
            hoveredButton = btn.id;
            break;
        }
    }
});


// ==============================
// 11. UTILITY INTERACTIONS
// ==============================

// === RNG SEED CONTROL ===
// Lets us make all random numbers repeatable for testing
let rngSeed = null; // null = normal random, number = fixed seed

// === SET SEED FOR TESTING ===
function setRNGSeed(seed) {
    rngSeed = seed >>> 0; // force to safe number
}

// === RANDOM NUMBER GENERATOR (SEEDED) ===
function seededRandom() {
    if (rngSeed === null) return Math.random();
    rngSeed += 0x6D2B79F5;
    let t = Math.imul(rngSeed ^ rngSeed >>> 15, 1 | rngSeed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// === CLAMP VALUE ===
// Keep a number between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// === RANDOM INTEGER ===
// Whole number between min and max
function randInt(min, max) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
}

// === RANDOM FLOAT ===
// Decimal number between min and max
function randFloat(min, max) {
    return seededRandom() * (max - min) + min;
}

// === LERP ===
// Smoothly move from a to b by t (0 to 1)
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// === DISTANCE ===
// Distance between two points
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// === ANGLE ===
// Angle between two points in radians
function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// === RECTANGLE OVERLAP ===
// Do two boxes touch or overlap?
function rectsOverlap(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
}

// === POINT INSIDE RECT ===
// Is a point inside a box?
function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
}

// === COLLISION CHECK ===
// Do two game objects touch?
function checkCollision(a, b) {
    return !(a.x + a.width < b.x ||
             a.x > b.x + b.width ||
             a.y + a.height < b.y ||
             a.y > b.y + b.height);
}

// === ENEMY IN VIEW ===
// Is an enemy inside the camera view?
function enemyInView(enemy) {
    return enemy.x + enemy.width > camera.x &&
           enemy.x < camera.x + GAME_WIDTH &&
           enemy.y + enemy.height > camera.y &&
           enemy.y < camera.y + GAME_HEIGHT;
}

// === LOOT DROP ===
// Drop heart or coin at given position
function dropLoot(x, y) {
    const roll = seededRandom();
    if (roll < 0.25) { // heart
        hearts.push({
            x: x - 16,
            y: y - 16,
            width: 32,
            height: 32,
            spawnFrame: frame
        });
    } else if (roll < 0.75) { // coin
        coins.push({
            x: x - 16,
            y: y - 16,
            width: 32,
            height: 32,
            spawnFrame: frame
        });
    }
}

// === SCREEN SHAKE ===
// Shake the camera for effect
function shakeScreen(intensity, duration) {
    camera.shake = {
        x: 0,
        y: 0,
        intensity: intensity || 5,
        duration: duration || 300,
        endTime: performance.now() + (duration || 300)
    };
}


// ==============================
// 12. MAIN LOOP
// ==============================

// === MAIN GAME LOOP ENTRY ===
function gameLoop(timestamp) {
    // calculate delta time in seconds
    if (!lastTime) lastTime = timestamp;
    deltaTime = (timestamp - lastTime) / (1000 / FPS_LIMIT); // normalized to 60fps
    lastTime = timestamp;

    // global frame counter still increments for animations (visual only)
    frame++;

    // === CLEAR CANVAS ===
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // === GAME STATE HANDLING ===
    switch (gameState) {
        case "title":
            drawTitleScreen();
            break;

        case "settings":
            drawSettingsScreen();
            break;

        case "paused":
            // draw paused overlay without advancing any game logic
            draw();
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = `${Math.floor(canvas.width / 20)}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("-- Paused --", canvas.width / 2, canvas.height / 2);
            requestAnimationFrame(gameLoop);
            return; // critical: exit early so no timers or movement update

        case "playing":
            update(dt = deltaTime); // pass dt for all physics/movement
            draw();
            break;

        case "levelstart":
            drawLevelStartScreen();
            break;

        case "gameover":
            drawGameOverScreen();
            break;

        case "gamecomplete":
            drawGameCompleteScreen();
            break;
    }

    // schedule next frame
    requestAnimationFrame(gameLoop);
}

// === MASTER UPDATE FUNCTION ===
function update(dt) {
    // ensure pause/gameover freeze is respected here too
    if (gameState === "paused" || gameState === "gameover") return;

    // === CAMERA SHAKE UPDATE ===
    applyCameraShake();

    // === PLAYER UPDATE ===
    if (player && !player.dead && !bossCutsceneActive) {
        updatePlayer(dt);
    }

    // === ENEMY UPDATE ===
    if (!bossCutsceneActive) {
        updateEnemies(dt);
    }

    // === PROJECTILES ===
    updateProjectiles(dt);

    // === PARTICLES ===
    updateParticles(dt);

    // === PICKUPS ===
    updatePickups(dt);

    // === OTHER TIMERS ===
    if (shakeTimer > 0) {
        shakeTimer -= dt; // dt-adjusted
        if (shakeTimer <= 0) cameraShakeAmount = CAMERA_SHAKE_DEFAULT;
    }
}

// === PAUSE TOGGLE ===
window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "p") {
        if (gameState === "paused") {
            gameState = lastGameState || "playing";
        } else {
            lastGameState = gameState;
            gameState = "paused";
        }
    }
});
