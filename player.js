// ==============================
// PLAYER MODULE
// ==============================
// TABLE OF CONTENTS
// 1. Constants & Globals
// 2. Player State & Logic
// 3. Input Handling
// 4. Player Entities

// ==============================
// 1. CONSTANTS & GLOBALS
// ==============================
const JUMP_FORCE = -45;

// ==============================
// 2. PLAYER STATE & LOGIC
// ==============================
window.updatePlayer = function(dt) {
    if (bossCutsceneActive || !player || player.dead) return;

    // === Timers: Block Sound
    if (player.blockSoundTimer > 0) player.blockSoundTimer--;

    // === Apply knockback from projectiles ===
    if (player.knockbackX) {
        player.x += player.knockbackX * dt;
        player.knockbackX *= 0.8;
        if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0;
    }


    // === Lock movement during attack, block, or cast ===
    if (player.isAttacking || player.attackTimer > 0 || player.isBlocking || player.castingMagic) {
        player.vx = 0;
    } else {
        // === Movement (restores movement if key is held after action)
        // Dynamic speed adjustment for each level
        let speed = 18; // Default for levels 1, 2, 3
        if (typeof currentLevel !== 'undefined') {
            if (currentLevel === 4) {
                speed = 20; // Increased by 2 for level 4
            } else if (currentLevel === 5) {
                speed = 21; // Increased by 3 for level 5
            } else if (currentLevel === 6) {
                speed = 21; // Increased by 3 for level 6
            }
        }
        if (keys["ArrowLeft"]) {
            player.vx = -speed;
            player.facing = "left";
        } else if (keys["ArrowRight"]) {
            player.vx = speed;
            player.facing = "right";
        } else {
            player.vx = 0;
        }
        // === Jumping
        if (keys[" "] && player.onGround) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
            playSound("jump", volumeSFX);
        }
        // === Blocking
        player.isBlocking = keys["ArrowUp"];
    }

    // === Cast Magic
    if (keys["Shift"] && !player.castingMagic && player.magicCooldown <= 0 && !player.isBlocking) {
        player.castingMagic = true;
        player.castFrame = frame + Math.max(1, Math.floor(60 * 0.15));
    }

    // === Apply physics
    player.vy += GRAVITY * dt;
    // === Barricade collision with soft overlap allowance
    const barricades = enemies.filter(e => e.spriteSet === "barricade" && !e.dead);
    for (let b of barricades) {
        // Classic: use intended next position for barricade collision, prevent flipping
        if (player.onGround && !b.dead) {
            const allowedOverlapRight = b.width * 0.5;
            const allowedOverlapLeft = 0;
            const nextX = player.x + player.vx;
            const overlapRight = (nextX + player.width) - b.x;
            const overlapLeft = (b.x + b.width) - nextX;
            const overlapY = player.y < b.y + b.height && player.y + player.height > b.y;
            // Only correct position if about to newly exceed allowed overlap
            // Moving right into barricade (allow 40% overlap)
            if (
                player.vx > 0 &&
                (player.x + player.width <= b.x + allowedOverlapRight) && // not already inside
                (player.x + player.vx + player.width > b.x + allowedOverlapRight) && // would newly exceed
                overlapY && keys["ArrowRight"] && !keys["ArrowLeft"]
            ) {
                player.x = b.x - player.width + allowedOverlapRight;
                player.vx = 0;
            }
            // Moving left into barricade (allow 0% overlap)
            else if (
                player.vx < 0 &&
                (player.x >= b.x + b.width - allowedOverlapLeft) && // not already inside
                (player.x + player.vx < b.x + b.width - allowedOverlapLeft) && // would newly exceed
                overlapY && keys["ArrowLeft"] && !keys["ArrowRight"]
            ) {
                player.x = b.x + b.width - allowedOverlapLeft;
                player.vx = 0;
            }
            // If already inside, do not correct position—allow escape
        }
        // Do not block if player is moving vertically (jumping) or stationary
    }
    // Barricade collision logic BEFORE position update
    player.x += player.vx;
    player.y += player.vy * dt;

    // === Invisible wall boundaries (left/right)
    if (typeof levelBounds !== 'undefined' && levelBounds.right) {
        player.x = Math.max(0, Math.min(player.x, levelBounds.right - player.width));
    }

    // === Camera follow
    // Camera follow logic
    // baseSpeed is now governed only by map size scaling for all levels
        camera.x = Math.max(0, Math.min(player.x - GAME_WIDTH / 2, levelBounds.right - GAME_WIDTH));
        // If needed, update player.x for level bounds (uncomment if intentional)
        // player.x = levelBounds.right - player.width;

    // === Ground collision (Quinn uses foot offset)
    const wasOnGround = player.onGround;
    const groundY = GAME_HEIGHT - GROUND_HEIGHT - player.height - PLAYER_FOOT_OFFSET;
    if (player.y >= groundY) {
        player.y = groundY;
        if (player.vy > 0) player.vy = 0;
        player.onGround = true;
        if (!wasOnGround) {
            spawnParticles("block", player.x + player.width / 2, player.y + player.height - 10);
        }
    }

    // === Timers
    player.magicCooldown = Math.max(0, player.magicCooldown - 1);
    if (player.castFrame && frame >= player.castFrame) {
        if (!player.dead && !bossCutsceneActive) {
            castFireball();
            player.magicCooldown = Math.floor(260 * 0.4);
        }
        player.castFrame = null;
        player.castingMagic = false;
    }
    player.attackCooldown = Math.max(0, player.attackCooldown - 1);
    player.invincibilityTimer = Math.max(0, player.invincibilityTimer - 1);
    player.hitFlash = Math.max(0, player.hitFlash - 1);
    if (player.attackTimer > 0) player.attackTimer--;
    else player.isAttacking = false;

    // === Coin pickups (require full collision)
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (checkCollision(player, coin)) {
            coinCount++;
            window.coinCount = coinCount;
            playSound("coin", volumeSFX * 0.3);
            coins.splice(i, 1);
            continue;
        }
    }
    coins = coins.filter(c => --c.life > 0);

    // === Heart pickups (require full collision)
    for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        if (checkCollision(player, heart)) {
            if (player.health < player.maxHealth) {
                player.health++;
                playSound("pickup", volumeSFX);
                hearts.splice(i, 1);
                continue;
            }
        }
    }
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

    // === Key pickups (require full collision)
    for (let i = keys.length - 1; i >= 0; i--) {
        if (checkCollision(player, keys[i])) {
            playSound("pickup", volumeSFX);
            setTimeout(() => playSound("win", volumeMusic), 500);
            spawnParticles("block", keys[i].x + keys[i].width / 2, keys[i].y + keys[i].height / 2 - 20);
            spawnParticles("hit", keys[i].x + keys[i].width / 2, keys[i].y + keys[i].height / 2 - 20);
            keys.splice(i, 1);
            endLevel4();
        }
    }

    // Trophy pickup logic (moved from engine.js)
    for (let i = trophies.length - 1; i >= 0; i--) {
        const trophy = trophies[i];
        if (trophy.type === "gate" && checkCollision(player, trophy)) {
            playSound("win", volumeMusic);
            spawnParticles("block", trophy.x + trophy.width / 2, trophy.y + trophy.height / 2 - 20);
            spawnParticles("hit", trophy.x + trophy.width / 2, trophy.y + trophy.height / 2 - 20);
            trophies.splice(i, 1);
            endLevel1();
        }
    }
}
// Resets player state to starting values for a new game/level
window.resetPlayer = function() {
    // Always initialize player
        // Claire pickup logic for Level 6
        if (typeof pickups !== 'undefined') {
            for (let i = pickups.length - 1; i >= 0; i--) {
                const pickup = pickups[i];
                if (pickup.type === "claire" && checkCollision(player, pickup)) {
                    playSound("pickup", volumeSFX);
                    playSound("win", volumeMusic);
                    spawnParticles("block", pickup.x + pickup.width / 2, pickup.y + pickup.height / 2 - 20);
                    spawnParticles("hit", pickup.x + pickup.width / 2, pickup.y + pickup.height / 2 - 20);
                    // Switch Claire to win sprite
                    pickup.winState = true;
                    // Add a short delay before transitioning to Chapter 7
                    setTimeout(function() {
                        gameState = "levelstart";
                        pickups.splice(i, 1);
                        chapterNum = 7;
                        if (typeof showChapterScreen === 'function') showChapterScreen(7);
                    }, 600); // 600ms delay for happy pose
                }
            }
        }
    const coins = player && player.coins !== undefined ? player.coins : 0;
    player = createPlayer();
    player.coins = coins;
};

// ==============================
// 3. INPUT HANDLING
// ==============================

// Player-specific key logic
window.playerKeyDown = function(e) {

    keys[e.key] = true;

    // Global/game-wide keys (call engine global functions)
    switch (e.key) {
        case "m":
        case "M":
            if (typeof window.toggleMute === 'function') window.toggleMute();
            break;
        case "m":
            if (typeof window.toggleMute === 'function') window.toggleMute();
            break;

        case "i":
            if (typeof window.toggleInvincibility === 'function') window.toggleInvincibility();
            break;

        case "p":
            if (typeof window.setPaused === 'function') window.setPaused();
            break;

        case "r":
            if (typeof window.tryRestartGame === 'function') window.tryRestartGame();
            break;

        case "Escape":
            if (typeof window.setSettings === 'function') window.setSettings();
            break;
    }
    if (!player) return;
    switch (e.key) {
        case "ArrowLeft":
            player.vx = -12;
            player.facing = "left";
            break;
        case "ArrowRight":
            player.vx = 12;
            player.facing = "right";
            break;
        case "ArrowDown":
            if (player.attackCooldown <= 0 && !player.isBlocking) {
                player.requestedAttack = true;
            }
            break;
        case "ArrowUp":
            player.isBlocking = true;
            break;
        case " ": // Space for jump
            if (player.onGround) {
                player.vy = JUMP_FORCE;
                player.onGround = false;
                playSound("jump", volumeSFX);
            }
            break;
        case "Shift":
            if (!player.castingMagic && player.magicCooldown <= 0 && !player.isBlocking) {
                player.castingMagic = true;
                player.castFrame = frame + Math.max(1, Math.floor(60 * 0.15));
            }
            break;
    }
};

window.playerKeyUp = function(e) {
    keys[e.key] = false;
    if (!player) return;
    switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
            player.vx = 0;
            break;
        case "ArrowUp":
            player.isBlocking = false;
            break;
    }
};

// ==============================
// 4. PLAYER ENTITIES
// ==============================
function createPlayer(x = 100) {
    return {
        x,
        y: GAME_HEIGHT - GROUND_HEIGHT - 64,
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
        invincible: false,
        isAttacking: false,
        castFrame: null,
        requestedAttack: false
    };
}
