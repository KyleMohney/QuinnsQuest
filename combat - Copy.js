// ==============================
// COMBAT SYSTEM
// Handles all player & enemy combat logic
// ==============================

// ==============================
// TABLE OF CONTENTS
//  1. Player Combat
//  2. Enemy Movement
//  3. Enemy Combat
//  4. Projectile Handling
//  5. Damage/Death/Hit Reactions
//  6. Visual Feedback Systems
//  7. Master Update Entry Port
//  8. Exports
// ==============================

// ==============================
// 1. PLAYER COMBAT
// ==============================

// Handles all per-frame timers for player combat actions.
// Includes magic cooldown, melee cooldown, invincibility duration, 
// and attack animation timing.

function updatePlayerCombatTimers() {
    if (!player) return;

    // === MAGIC COOLDOWN ===
    player.magicCooldown = Math.max(0, player.magicCooldown - 1);

    // === FIREBALL RELEASE AFTER CAST DELAY ===
    if (player.castFrame && frame >= player.castFrame) {
        if (!player.dead && !bossCutsceneActive) {
            castFireball();
            player.magicCooldown = player.magicCooldownMax || 260; // use max if defined, else backup default
        }
        player.castFrame = null;
        player.castingMagic = false;
    }

    // === MELEE & DAMAGE TIMERS ===
    player.attackCooldown = Math.max(0, player.attackCooldown - 1);
    player.invincibilityTimer = Math.max(0, player.invincibilityTimer - 1);
    player.hitFlash = Math.max(0, player.hitFlash - 1);

    // === ATTACK ANIMATION TIMER ===
    if (player.attackTimer > 0) player.attackTimer--;
    else player.isAttacking = false;
}

// === Performs a melee attack for the player.
// === Handles hit detection, blocking, damage, and special barricade interactions.

function performMeleeAttack() {
    if (!player || player.dead) return;
    if (player.isBlocking || player.attackCooldown > 0) return;

    // === BEGIN ATTACK STATE ===
    player.attackCooldown = 13; // Unified to backup baseline
    player.attackTimer = 7;     // Unified to backup baseline
    player.isAttacking = true;
    playSound("slash-1", volumeSFX);

    // === PROCESS ENEMIES IN RANGE ===
    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;
        const reach = 8; // extra horizontal hitbox reach
        if (checkCollision(player, enemy, reach)) {

            // === BARRICADE SPECIFIC DAMAGE ===
            if (enemy.spriteSet === "barricade") {
                const BARRICADE_SOFT_MARGIN = 40; // Fixed undefined `softMargin` reference
                enemy.health -= player.damage || 1;
                enemy.hitFlash = 10;
                enemy.glow = "red";
                enemy.glowTimer = 10;
                spawnParticles("hit", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 - 20);
                playSound("sword_hit", volumeSFX);
                if (enemy.health <= 0) handleEnemyDeath(enemy);
                continue;
            }

            // === ENEMY BLOCK ROLL ===
            const blocked = Math.random() < (enemy.blockChance || 0);
            if (blocked) {
                playSound("block", volumeSFX);
                spawnParticles("block", enemy.x, enemy.y);
                enemy.glow = "blue";
                enemy.glowTimer = 10;
                applyMeleeBlockKnockback(enemy);
                continue;
            }

            // === NORMAL DAMAGE RESOLUTION ===
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

// === PLAYER FIREBALL RULES ===
function castFireball() {
    // backup’s muzzle placement offsets for consistent casting visuals
    const offsetX = player.facing === "right" ? player.width - 20 : -60;
    const fireball = {
        x: player.x + offsetX,
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

// === PLAYER HIT BY MAGIC SOUNDS
function getHitSound(type) {
    if (type === "acid") return "acid_hit";
    if (type === "crossbow_bolt") return "sword_hit";
    if (type === "evil_magic") return "evil_magic_hit";
    return "fireball_hit";
}

// === UNIFIED PROJECTILE HIT SOUND ===
function safePlayProjectileHitSound(pType) {
    playSound(getHitSound(pType), volumeSFX);
}

// === ENEMY DAMAGE ===
function hurtPlayer(damage, knockX = 0, knockY = 0) {
    // Apply knockback in X and Y directions (backup behavior)
    player.knockbackX = knockX;
    player.vy += knockY;

    // Set invincibility frames and flags
    player.invincible = true;
    player.invincibilityTimer = 60; // backup safe default

    // Cancel actions
    player.isAttacking = false;
    player.castingMagic = false;
    player.castFrame = null;

    // Apply damage
    player.health -= damage;
    if (player.health <= 0) {
        handlePlayerDeath();
    } else {
        playSound("quinn-hurt", volumeVoices);
        spawnParticles("hit", player.x + player.width / 2, player.y + player.height / 2);
    }
}

// === PLAYER DEATH ===
function handlePlayerDeath() {
    player.dead = true;
    gameState = "gameover";
    stopAllSounds();
    playSound("quinn-hurt", volumeVoices);
    playSound("lose", volumeMusic);
}

// === Apply melee block knockback ===
function applyMeleeBlockKnockback(enemy) {
    const pushDir = enemy.x < player.x ? -1 : 1;
    enemy.knockbackX = pushDir * -3;
}



// ==============================
// 2. ENEMY MOVEMENT
// ==============================

// === APPLY KNOCKBACK (WITH DECAY) ===
// Knockback applies even when paused, game over, or during cutscenes.
function updateEnemyKnockback(enemy) {
    if (typeof enemy.knockbackX !== "number") enemy.knockbackX = 0; // Ensure defined
    if (enemy.knockbackX) {
        enemy.x += enemy.knockbackX;
        enemy.knockbackX *= 0.6;
        if (Math.abs(enemy.knockbackX) < 0.5) enemy.knockbackX = 0;
    }
}

// === FREEZE WHEN PAUSED/GAME OVER ===
if (gameState === "paused" || gameState === "gameover") continue;

// === BOSS INTRO CUT SCENE TRIGGER ===
if (
   (enemy.spriteSet === "bandit_leader" || enemy.spriteSet === "zombie_lord") &&
   !bossIntroTriggered
) {
    if (enemy.x - camera.x < GAME_WIDTH && gameState === "playing") {
        bossIntroTriggered = true;
        bossCutsceneActive = true;
        stopAllSounds();

        const bossSound = enemy.spriteSet === "zombie_lord" ? "zombie_lord" : "bandit_leader";
        const quinnResponse = enemy.spriteSet === "zombie_lord" ? "quinn_zombie" : "quinn2";

        // Store cutscene events with frame timings
        bossIntroSequence = [
            { frame: frame + 15, action: () => playSound(bossSound, volumeVoices) },  // 250ms
            { frame: frame + 75, action: () => playSound(quinnResponse, volumeVoices) }, // +1000ms
            { frame: frame + 135, action: () => { bossCutsceneActive = false; } } // +1000ms
        ];
    }
}

// === BOSS INTRO CUT SCENE UPDATER ===
if (bossCutsceneActive && Array.isArray(bossIntroSequence)) {
    for (let i = bossIntroSequence.length - 1; i >= 0; i--) {
        if (frame >= bossIntroSequence[i].frame) {
            bossIntroSequence[i].action();
            bossIntroSequence.splice(i, 1);
        }
    }
}

// === FREEZE ENEMIES OFF-CAMERA ===
if (!enemyInView(enemy) || gameState !== "playing") continue;

// === DECREMENT TIMERS (COUNT DOWN TO ZERO) ===
if (enemy.hitFlash > 0) enemy.hitFlash--;
if (enemy.attackCooldown > 0) enemy.attackCooldown--;
if (enemy.castCooldown > 0) enemy.castCooldown--;

// === FACE PLAYER (EXCEPT BARRICADE) ===
function updateEnemyFacing(enemy) {
    if (enemy.spriteSet !== "barricade") {
        enemy.facing = player.x < enemy.x ? "left" : "right";
    }
}

// === MOVEMENT TOWARD PLAYER WITH STOP FUNCTION ===
function updateEnemyMovement(enemy, dt, barricades) {
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

    // === PREVENT PASS THROUGH BARRICADES ===
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
}

// === BARRICADES STAY STILL ===
function lockBarricade(enemy) {
    if (enemy.spriteSet === "barricade") {
        enemy.vx = 0;
        enemy.vy = 0;
        return true; // Indicates barricade is locked in place
    }
    return false;
}

// === PREVENT ENEMY STACK ON PLAYER ===
function pushEnemyOffPlayer(enemy) {
    const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
    if (Math.abs(dx) < 4) {
        enemy.x += dx >= 0 ? 1.5 : -1.5;
    }
}

// === PREVENT ENEMY OVERLAP X-AXIS ===
function preventEnemyOverlap(enemy, enemies) {
    for (let other of enemies) {
        if (other !== enemy && !other.dead) {
            const dxOther = enemy.x - other.x;
            if (Math.abs(dxOther) < enemy.width && Math.abs(enemy.y - other.y) < enemy.height) {
                enemy.x += dx


// ==============================
// 3. ENEMY COMBAT
// ==============================

// === HANDLE ENEMY MELEE ATTACKS ===
function handleEnemyMelee(enemy) {
    if (!player || player.dead || enemy.dead || bossCutsceneActive) return;

    const distX = Math.abs((enemy.x + enemy.width / 2) - (player.x + player.width / 2));
    const distY = Math.abs((enemy.y + enemy.height / 2) - (player.y + player.height / 2));

    if (distX < enemy.width && distY < enemy.height) {
        if (player.isBlocking) {
            playSound("block", volumeSFX);
            spawnParticles("block", player.x, player.y);
            player.glow = "blue";
            player.glowTimer = 10;
            player.knockbackX = enemy.facing === "left" ? -2 : 2;
        } else {
            hurtPlayer(enemy.damage || 1);
            playSound("slash-2", volumeSFX);
            spawnParticles("hit", player.x, player.y);
            player.glow = "red";
            player.glowTimer = 10;
            player.knockbackX = enemy.facing === "left" ? -3 : 3;
        }
    }
}

// === HANDLE ENEMY RANGED ATTACKS ===
function handleEnemyRanged(enemy, projectileType) {
    if (!enemy || enemy.dead || bossCutsceneActive) return;

    let speed = 6;
    let damage = 1;
    let soundKey = "";

    switch (projectileType) {
        case "acid":
            soundKey = "acid";
            damage = 1;
            break;
        case "evil_magic":
            soundKey = "evil_magic";
            damage = 2;
            break;
        case "crossbow_bolt":
            soundKey = "crossbow_bolt";
            damage = 2;
            break;
        default:
            soundKey = "fireball";
            damage = 1;
    }

    const vx = enemy.facing === "left" ? -speed : speed;
    const proj = {
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        vx: vx,
        vy: 0,
        width: 20,
        height: 20,
        damage: damage,
        owner: "enemy",
        type: projectileType
    };

    playSound(soundKey, volumeSFX);
    projectiles.push(proj);
}

// === ENEMY DEATH HANDLER ===
function handleEnemyDeath(enemy) {
    enemy.dead = true;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.knockbackX = 0;

    // Drop coins
    if (typeof spawnCoin === "function") {
        const dropCount = enemy.coinValue || 1;
        for (let i = 0; i < dropCount; i++) {
            spawnCoin(enemy.x + enemy.width / 2, enemy.y);
        }
    }

    // Heart drop logic (from backup baseline)
    if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "zombie_lord") {
        if (Math.random() < 0.5) { // 50% drop chance
            if (typeof spawnHeart === "function") {
                spawnHeart(enemy.x + enemy.width / 2, enemy.y);
                playSound("pickup", volumeSFX);
            }
        }
    }

    // Play death sound if available
    if (enemy.deathSound) {
        playSound(enemy.deathSound, volumeSFX);
    }
}

// === BOSS INTRO TRIGGER & SEQUENCE (Frame-based, deterministic) ===
function triggerBossIntro(enemy, bossSound, quinnResponse) {
    bossIntroTriggered = true;
    bossCutsceneActive = true;
    stopAllSounds();

    bossIntroSequence = [
        { frame: frame + 15, action: () => playSound(bossSound, volumeVoices) },  // ~250ms
        { frame: frame + 75, action: () => playSound(quinnResponse, volumeVoices) }, // +1000ms
        { frame: frame + 135, action: () => { bossCutsceneActive = false; } } // +1000ms
    ];
}

// ==============================
// 4. PROJECTILE HANDLING
// ==============================

function handlePlayerProjectileCollision(p, i) {
    // === BARRICADES ===
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
            return true;
        }
    }

    // === ENEMIES ===
    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        if (checkCollision(p, enemy)) {
            const blocked = Math.random() < (enemy.blockChance || 0);

            // === BLOCKED PROJECTILE ===
            if (blocked) {
                playSound("block", volumeSFX);
                const yOffset = enemy.height * 0.6; // Mid-body impact
                spawnParticles("block", enemy.x, enemy.y - yOffset);
                enemy.glow = "blue";
                enemy.glowTimer = 10;
                enemy.knockbackX = p.vx * 0.75; // ✅ Added knockback on block (fix)

                projectiles.splice(i, 1);
                return true;
            }

            // === PLAYER PROJECTILE HITS ===
            enemy.health -= p.damage || 2;
            enemy.knockbackX = p.vx * 0.8; // ✅ Consistent knockback property
            enemy.hitFlash = 10;
            enemy.glow = "red";
            enemy.glowTimer = 10;

            spawnParticles("hit", enemy.x, enemy.y);
            safePlayProjectileHitSound(p.type); // ✅ Helper call for sound consistency

            if (enemy.health <= 0) {
                handleEnemyDeath(enemy);
                enemy.knockbackX = 0; // No continued push on dead enemies
            }

            projectiles.splice(i, 1);
            return true;
        }
    }
    return false;
}

// === ENEMY PROJECTILE HITS ===
function handleEnemyProjectileHitPlayer(p, i) {
    if (checkCollision(p, player)) {
        projectiles.splice(i, 1);

        if (player.isBlocking) {
            playSound("block", volumeSFX);
            spawnParticles("block", player.x, player.y);
            player.knockbackX = p.vx * 0.75;
            player.glow = "blue";
            player.glowTimer = 10;
        } else {
            const dmg = Math.max(0, p.damage || 1);

            if (!player.invincible && dmg > 0) {
                hurtPlayer(dmg);
                safePlayProjectileHitSound(p.type); // ✅ Consistent hit sound mapping
                spawnParticles("hit", player.x, player.y);
                player.glow = "red";
                player.glowTimer = 10;
                player.knockbackX = p.vx * 1;
            }
        }
        return true;
    }
    return false;
}

// === PLAYER PROJECTILE COLLISION
function handleEnemyProjectileCollision(p, i) {
    return handleEnemyProjectileHitPlayer(p, i);
}

// === UPDATE PROJECTILES ===
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        // === PROJECTILE POSITION ===
        p.x += p.vx * dt;
        p.y += (p.vy || 0) * dt;

        // === REMOVE IF OUT OF BOUNDS (Both axes) ===
        if (
            p.x < 0 || p.x > levelBounds.right ||
            p.y < 0 || p.y > GAME_HEIGHT
        ) {
            projectiles.splice(i, 1);
            continue;
        }

        if (p.owner === "player") {
            if (handlePlayerProjectileCollision(p, i)) continue;
        } else if (p.owner === "enemy") {
            if (handleEnemyProjectileCollision(p, i)) continue;
        }
    }
}


// ==============================
// 5. DAMAGE, DEATH & HIT REACTIONS
// ==============================

// === PLAYER HURT ===
function hurtPlayer(damage) {
    player.health -= damage;
    if (player.health <= 0) {
        handlePlayerDeath();
    } else {
        playSound("quinn-hurt", volumeVoices);
    }
}

// === PLAYER DEATH ===
function handlePlayerDeath() {
    player.dead = true;
    gameState = "gameover";
    stopAllSounds();
    playSound("quinn-hurt", volumeVoices);
    playSound("lose", volumeMusic);
}

// === ENEMY DEATH ===
function handleEnemyDeath(enemy) {
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.knockbackX = 0;
    enemy.attacking = false;
    enemy.casting = 0;
    enemy.castCooldown = 0;
    enemy.attackCooldown = 0;
    enemy.attackTimer = 0;
    enemy.blocking = false;
    enemy.hitFlash = 0;
    enemy.glow = null;
    enemy.glowTimer = 0;

    // === DEATH SPRITE & ANIMATION ===
    if (enemy.sprite) {
        enemy.sprite = "dead";
    }
    spawnParticles("death", enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    if (typeof playSound === "function") {
        playSound("enemy_death", volumeSFX);
    }
    if (typeof shakeScreen === "function") {
        shakeScreen(5, 300); // small screen shake
    }

    // === LOOT DROPS ===
    if (typeof dropLoot === "function") {
        dropLoot(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    }

    // === Heart drop logic from backup baseline ===
    if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "zombie_lord") {
        if (Math.random() < 0.5) { // 50% drop chance
            if (typeof spawnHeart === "function") {
                spawnHeart(enemy.x + enemy.width / 2, enemy.y);
                playSound("pickup", volumeSFX);
            }
        }
    }

    // === REMOVE CORPSE FROM SCRIPT ARRAY ===
    const index = enemies.indexOf(enemy);
    if (index !== -1) enemies.splice(index, 1);
}

// === APPLY MELEE/BLOCK REACTION KNOCKBACK ===
function applyBlockReaction(target, sourceVx, multiplier) {
    if (typeof target.knockbackX !== "number") target.knockbackX = 0;
    target.knockbackX = sourceVx * multiplier;
}


// ==============================
// 6. VISUAL & FEEDBACK SYSTEMS
// ==============================

// === PLAYER & ENEMY GLOW ===
function updateGlow() {
    if (!player) return;

    // === PLAYER GLOW LOGIC ===
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

    // === ENEMY GLOW LOGIC ===
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

// === PARTICLE UPDATES ===
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

// === CAMERA SHAKE HELPERS ===
function applyCameraShake(intensity, duration) {
    if (typeof shakeTimer !== "number") shakeTimer = 0;
    if (typeof shakeIntensity !== "number") shakeIntensity = 0;
    shakeTimer = duration;
    shakeIntensity = intensity;
}

function getCameraShakeOffset() {
    if (shakeTimer > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        shakeTimer--;
        return { dx, dy };
    }
    return { dx: 0, dy: 0 };
}


// ==============================
// 7. MASTER UPDATE ENTRY POINT
// ==============================

function updateCombat(dt) {
    updateProjectiles(dt);
    updateGlow();
    updateParticles(dt);

    // === RESUME MUSIC ON UNPAUSE (Clean engine baseline) ===
    if (gameState === "playing" && currentMusic && currentMusic.paused) {
        try {
            currentMusic.play();
        } catch (e) {
            console.warn("Music resume blocked:", e);
        }
    }
}

// ==============================
// 8. EXPORTS
// ==============================

// NOTE: These are now the single source of truth for combat-related logic.
// Ensure no duplicate definitions exist in other engine files to avoid last-write-wins bugs.
export {
    performMeleeAttack,
    castFireball,
    handleEnemyMelee,
    handleEnemyRanged,
    updateProjectiles,
    hurtPlayer,
    handlePlayerDeath,
    handleEnemyDeath,
    updateGlow,
    updateParticles,
    updateCombat
};
