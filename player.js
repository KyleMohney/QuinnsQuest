// ==============================
// PLAYER
// ==============================
// TABLE OF CONTENTS
//  1. Constants & Flags
//  2. Player Creation
//  3. Player Update
//  4. Player Pickups
//  5. Drawing Player
//  6. Input Handling
// ==============================


// ==============================
// 1. CONSTANTS & FLAGS
// ==============================

// === PLAYER CONSTANTS ===
const PLAYER_Y_OFFSET    = 40;     // Vertical adjustment to spawn height
const JUMP_FORCE         = -17;    // Velocity applied when jumping (negative = upward)
const PLAYER_RUN_SPEED   = 6;      // Horizontal movement speed
const PLAYER_GRAVITY     = 1;      // Gravity applied per frame
const PLAYER_FRICTION    = 0.8;    // Horizontal slowdown on ground

// === PLAYER STATE FLAGS ===
// These values are initialized/reset here to ensure consistent behavior
let player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 64,
    height: 96,
    facing: "right",
    health: 5,
    maxHealth: 5,
    coins: 0,
    attackCooldown: 0,          // Frames until melee attack allowed again
    attackTimer: 0,              // Frames remaining in melee animation
    isAttacking: false,
    magicCooldown: 0,            // Frames until magic can be cast again
    magicCooldownMax: 260,       // Max cooldown duration (~4.33s @ 60fps)
    castFrame: null,             // Frame when magic actually fires
    castingMagic: false,
    invincible: false,           // Temporary invincibility (e.g., after being hit)
    invincibilityTimer: 0,       // Frames remaining for invincibility
    hitFlash: 0,                  // Frames remaining for red hit glow
    onGround: false,             // True when player is touching ground
    isBlocking: false,           // True when player is holding block input
    glow: null,                   // Current glow color (red/yellow/blue)
    glowTimer: 0,                 // Frames remaining for glow effect
    knockbackX: 0,                // Horizontal knockback velocity
    knockbackY: 0                 // Vertical knockback velocity
};

// ==============================
// 2. PLAYER CREATION
// ==============================
function createPlayer(x = 100) {   // Default starting X position = 100px from left
    return {
        x,                                          // Player's current X position
        y: GAME_HEIGHT - GROUND_HEIGHT - 128 + PLAYER_Y_OFFSET, 
                                                   // Starting Y: feet on ground with offset for sprite alignment
                                                   // 128 = full sprite height baseline for positioning (matches backup)
        width: 128,                                 // Sprite width (px)
        height: 128,                                // Sprite height (px)
        vx: 0,                                      // Horizontal velocity
        vy: 0,                                      // Vertical velocity
        knockbackX: 0,                              // Horizontal knockback from hits
        knockbackY: 0,                              // Vertical knockback from hits
        speed: PLAYER_RUN_SPEED,                    // Movement speed (px/frame)
        jumpPower: Math.abs(JUMP_FORCE),            // Jump impulse strength (positive magnitude)
        gravity: GRAVITY,                           // Gravity acceleration
        health: 10,                                 // Starting HP
        maxHealth: 10,                              // Maximum HP
        isBlocking: false,                          // Whether blocking
        facing: "right",                            // Facing direction
        isJumping: false,                           // Jump state
        onGround: true,                             // Grounded state
        invincible: false,                          // Temporary invincibility flag
        invincibilityTimer: 0,                      // Frames remaining of invulnerability
        attackCooldown: 0,                          // Frames before another attack can start
        attackTimer: 0,                             // Frames until current attack ends
        blockSoundTimer: 0,                         // Frames until block sound can play again
        magicCooldown: 0,                           // Frames until magic can be cast again
        magicCooldownMax: 260,                      // Max cooldown duration (~4.33s @ 60fps)
        castingMagic: false,                        // Whether currently casting magic
        dead: false,                                // Death state
        hitFlash: 0,                                // Frames to display red hit flash
        glow: null,                                 // Glow color (null if none)
        glowTimer: 0,                               // Frames until glow ends
        damage: 1,                                  // Melee damage per hit
        isAttacking: false,                         // Whether currently attacking
        castFrame: null,                            // Frame number when spell should fire
        coins: 0,                                   // Total coins collected
        spriteSet: "quinn"                          // Sprite set key
    };
}


// ==============================
// 3. PLAYER UPDATE
// ==============================
function updatePlayer(dt) {

    if (bossCutsceneActive || !player || player.dead) return;

    // === BLOCK SOUND TIMER ===
    if (player.blockSoundTimer > 0) player.blockSoundTimer -= dt;

    // === MOVEMENT CONTROL ===
    if (player.isBlocking || player.castingMagic || player.attackTimer > 0) { // Prevent sliding while in an action
        if (!player.hitFlash && player.glow !== "red") player.vx = 0;
    } else {
        if (keys["ArrowLeft"] || keys["a"]) {
            player.vx = -player.speed;      // Speed constant set in createPlayer()
            player.facing = "left";
        } else if (keys["ArrowRight"] || keys["d"]) {
            player.vx = player.speed;
            player.facing = "right";
        } else {
            player.vx = 0; // 0 = FULL STOP
        }
    }

    // === PROJECTILE KNOCKBACK (DT-SCALED) ===
    if (player.knockbackX) {
        player.x += player.knockbackX * dt;
        player.knockbackX *= Math.pow(0.8, dt); // decay multiplier scaled by dt
        if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0; // min threshold
    }

    // === JUMPING ===
    if ((keys[" "] || keys["ArrowUp"] || keys["w"]) && player.onGround) {
        player.vy = -player.jumpPower;       // Negative = upward jump
        player.onGround = false;
        playSound("jump", volumeSFX);
    }

    // === BLOCKING ===
    player.isBlocking = keys["ArrowUp"];

    // === MELEE ATTACKS ===
    if (keys["ArrowDown"] && player.attackCooldown <= 0 && !player.isBlocking) {
        performMeleeAttack();
    }

    // === CAST MAGIC (DT-SYNCED CAST FRAME) ===
    if (keys["Shift"] && !player.castingMagic && player.magicCooldown <= 0 && !player.isBlocking) {
        player.castingMagic = true;
        // store cast time in milliseconds, not just frame count, for accurate sync
        player.castFrame = performance.now() + (1000 * (60 / 60)); // ~1 second delay
    }

    // === APPLY PHYSICS ===
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // === CAMERA FOLLOW ===
    const gateStop = levelBounds.right - GAME_WIDTH + 32; // 32 = small right offset
    camera.x = Math.max(0, Math.min(player.x - GAME_WIDTH / 2, gateStop));

    // === STAY INSIDE WORLD BOUNDS ===
    if (player.x < levelBounds.left) player.x = levelBounds.left;
    if (player.x + player.width > levelBounds.right)
        player.x = levelBounds.right - player.width;

    // === GROUND COLLISION ===
    const wasOnGround = player.onGround;
    if (player.y + player.height >= GAME_HEIGHT - GROUND_HEIGHT) {
        player.y = GAME_HEIGHT - GROUND_HEIGHT - player.height;
        player.vy = 0;
        player.onGround = true;
        if (!wasOnGround) {
            spawnParticles("block", player.x + player.width / 2, player.y + player.height - 10); // 10 = spark Y offset
        }
    }

    // === BARRICADE OVERLAP ALLOWANCE ===
    const barricades = enemies.filter(e => e.spriteSet === "barricade" && !e.dead && enemyInView(e));
    for (let b of barricades) {
        const overlapX = player.x + player.width - b.x;
        const overlapXReverse = b.x + b.width - player.x;
        const BARRICADE_SOFT_MARGIN = 40; // Magic number: Increase to sink deeper in horizontally

        if (checkCollision(player, b)) {
            const comingFromLeft = player.x + player.width <= b.x + b.width / 2;
            const comingFromRight = player.x >= b.x + b.width / 2;

            if (player.vx > 0 && comingFromLeft && overlapX > BARRICADE_SOFT_MARGIN) {
                player.x = b.x - player.width + BARRICADE_SOFT_MARGIN;
                player.vx = 0;
            } else if (player.vx < 0 && comingFromRight && overlapXReverse > BARRICADE_SOFT_MARGIN) {
                player.x = b.x + b.width - BARRICADE_SOFT_MARGIN;
                player.vx = 0;
            }
        }
    }

    // === PLAYER ACTIONS ===
    updatePlayerCombatTimers(dt);
}


// ==============================
// 4. PLAYER PICKUPS
// ==============================
function updatePlayerPickups() {

    // === HEART PICKUPS ===
    hearts = hearts.filter(h => {
        if (checkCollision(player, h) && player.health < player.maxHealth) {
            player.health++;
            playSound("pickup", volumeSFX); // consistent pickup sound
            return false; // remove this heart
        }
        return --h.life > 0; // keep if still alive
    });

    // === COIN PICKUPS ===
    coins = coins.filter(c => {
        if (checkCollision(player, c)) {
            player.coins++; // track in player object
            playSound("coin", volumeSFX * 0.3); // 0.3 = lower volume for coin sound
            return false; // remove this coin
        }
        return --c.life > 0;
    });

    // === ITEM TROPHY PICKUPS (keys, scrolls, gems, etc.) ===
    itemTrophies = itemTrophies.filter(item => {
        if (checkCollision(player, item)) {
            // scrolls specifically match backup's pickup.mp3 behavior
            if (item.type === "scroll") {
                playSound("pickup", volumeSFX);
            } else {
                playSound("pickup", volumeSFX);
            }
            // Here you could also add quest/item-specific logic if needed
            return false; // remove this item
        }
        return --item.life > 0;
    });
}


// ==============================
// 5. DRAWING PLAYER
// ==============================
function drawPlayer() {

    if (!player) return;

    let sprite = null;
    let yOffset = 0;
    const STANDING_OFFSET = 30; // BASE OFFSET FOR IDLE/DEFAULT POSE

    // === DEATH ===
    if (player.dead && images.quinn_dead) {
        sprite = images.quinn_dead;
        yOffset = 64; // MATCHES BACKUP'S DEAD SPRITE ALIGNMENT

    // === CASTING MAGIC ===
    } else if (player.castingMagic && images.quinn_casting) {
        sprite = images.quinn_casting;

    // === BLOCKING ===
    } else if (player.isBlocking && images.quinn_block) {
        sprite = images.quinn_block;
        yOffset = -28; // ADJUSTS BLOCK POSE TO ALIGN WITH GROUND

    // === MELEE ATTACK ===
    } else if ((player.attackTimer > 0 || player.isAttacking) && images.quinn_slash) {
        sprite = images.quinn_slash;

    // === RUNNING ===
    } else if (Math.abs(player.vx) > 1) {
        const haveRun123 = images.quinn_run1 && images.quinn_run2 && images.quinn_run3;
        if (haveRun123) {
            const RUN_CYCLE_FRAMES = 40; // FULL CYCLE LENGTH (4 STEPS × 10 FRAMES)
            const RUN_STEP_FRAMES = 10;  // FRAMES PER STEP
            const step = Math.floor((frame % RUN_CYCLE_FRAMES) / RUN_STEP_FRAMES);
            const runSeq = [
                images.quinn_run1,
                images.quinn_run2,
                images.quinn_run3,
                images.quinn_run2
            ];
            sprite = runSeq[step];
        } else if (images.quinn_run1 && images.quinn_run2) {
            sprite = (frame % 20 < 10) ? images.quinn_run1 : images.quinn_run2; // FALLBACK 2-FRAME RUN
        } else if (images.quinn_idle) {
            sprite = images.quinn_idle; // FALLBACK TO IDLE IF RUN FRAMES MISSING
        }

    // === IDLE ===
    } else if (images.quinn_idle) {
        sprite = images.quinn_idle;
    }

    // === INVINCIBLE/HERO MODE ===
    if (sprite) {
        // Priority glow handling: yellow (invincible) > red (hit) > player.glow (e.g. block blue)
        let glowColor = null;
        if (player.invincible) glowColor = "yellow";
        else if (player.hitFlash > 0) glowColor = "red";
        else glowColor = player.glow || null;

        const facingDir = player.facing === "left" ? "left" : "right";

        drawTrimmedSprite(
            sprite,
            player.x - camera.x, // CAMERA OFFSET X
            player.y + (player.dead ? yOffset : STANDING_OFFSET + yOffset),
            sprite.width,
            sprite.height,
            facingDir,
            glowColor
        );
    }
}


// ==============================
// 6. INPUT HANDLING
// ==============================
//
// HANDLES ALL KEYBOARD INPUT FOR:
// - MOVEMENT (HANDLED IN updatePlayer())
// - GAME STATE TOGGLES (PAUSE, MUTE, SETTINGS)
// - DEBUG/TEST KEYS (INVINCIBILITY, RESTART)
//
// MOVEMENT KEYS ARE READ DIRECTLY FROM `keys[]` IN updatePlayer()
// THIS SECTION ONLY SETS/CLEARS THOSE FLAGS

// === RAW KEY STATE TRACKING & SPECIAL KEYBINDS ===
document.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    switch (key) {
        case "m": // TOGGLE MUTE
            muted = !muted;
            break;

        case "i": // TOGGLE INVINCIBILITY
            if (player) player.invincible = !player.invincible;
            break;

        case "p": // TOGGLE PAUSE
            if (["playing", "paused"].includes(gameState)) {
                gameState = (gameState === "playing") ? "paused" : "playing";
            }
            break;

        case "r": // RESTART ON GAME OVER
            if (gameState === "gameover") {
                restartGame();
            }
            break;

        case "escape": // TOGGLE SETTINGS MENU
            if (["playing", "settings"].includes(gameState)) {
                gameState = (gameState === "playing") ? "settings" : "playing";
            }
            break;
    }
});

// === KEY RELEASE HANDLER ===
document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});