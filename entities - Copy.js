// ==============================
// GAME ENTITIES
// ==============================
// TABLE OF CONTENTS
// 1. Object Collections
// 2. ENTITY Helpers
// 3. Pickup Helpers
// 4. Entity Library
// 5. Death Handling
// 6. Entity Sprite Selection
// 7. Entity Draw Functions
// 8. Entity HUD Elements


// ==============================
// 1. OBJECT COLLECTIONS
// ==============================

// All active entities and objects in the game world
let enemies = [];       // Active enemies on screen
let projectiles = [];   // Active projectiles (player + enemies)
let particles = [];     // Active particle effects
let coins = [];         // Active coin pickups
let hearts = [];        // Active heart pickups
let trophies = [];      // Level-completion trophies
let scrolls = [];       // Magic scrolls / keys from bosses


// ==============================
// 2. ENTITY HELPERS
// ==============================

// === Reset enemies array and clear any stale state ===
// Call this when starting a new level to avoid inheriting glow, cooldown, etc.
function initEnemies() {
    enemies.length = 0;
}

// === Calculates Y-position for entity placement with a small embed offset into the ground.
function staggeredGroundY(height, embedOffset = 0, customEmbed = null) {
    const buffer = 4; // Small gap so sprites don't visually "float" above ground
    const embed = (customEmbed !== null)
        ? -customEmbed
        : 35 + Math.random() * 10 + embedOffset; // Random embed depth for variety

    return (typeof GAME_HEIGHT !== "undefined" && typeof GROUND_HEIGHT !== "undefined")
        ? GAME_HEIGHT - GROUND_HEIGHT - height + embed - buffer
        : 0; // Safe default if constants not loaded yet
}

// === Simple collision check with optional padding.
function checkCollision(a, b, padding = 0) {
    return (
        a.x < b.x + b.width - padding &&
        a.x + a.width - padding > b.x &&
        a.y < b.y + b.height - padding &&
        a.y + a.height - padding > b.y
    );
}

// === Spawns particle effects at a given position.
function spawnParticles(type, x, y, count = 12) {
    const originY = y + 20 + Math.random() * 6 - 3; // Slight vertical variance for realism
    for (let i = 0; i < count; i++) {
        const dirX = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.5);
        const dirY = 1 + Math.random() * 1.5;
        particles.push({
            type,
            x: x + Math.random() * 20 - 10,
            y: originY,
            vx: dirX,
            vy: dirY,
            life: 30 + Math.floor(Math.random() * 20) // Particle lifespan in frames
        });
    }
}

// === Only enemies in camera frame attack
// Uses global helper if available to avoid duplication
function enemyInView(enemy) {
    if (typeof isEnemyInView === "function") {
        return isEnemyInView(enemy);
    }
    return (
        enemy.x >= camera.x - 100 &&
        enemy.x <= camera.x + GAME_WIDTH + 200
    );
}

// === Checks if enemy is in melee range
function enemyInRange(enemy) {
    return checkCollision(player, enemy, 16); // 16px padding = melee reach range
}

// === Checks if enemy is ready to attack
function enemyReadyToAttack(enemy) {
    return (enemy.attackCooldown ?? 0) <= 0;
}


// ==============================
// 3. PICKUP HELPERS
// ==============================

// === Coin drop with bounce/spawnFrame properties for animation sync ===
function spawnCoin(x, y) {
    const dropOffsetX = -8; // Center coin sprite over source position
    coins.push({
        x: x + dropOffsetX,
        y,
        width: 25,
        height: 25,
        spriteSet: "coin",
        value: 1,
        spawnFrame: frame ?? 0, // Used for bounce/rotation timing
        bounce: Math.random() * 2, // Small bounce variance
        life: 2000 // Lifetime in frames (~33 seconds at 60fps)
    });
}

// === Heart drop with bounce/spawnFrame properties for animation sync ===
function spawnHeart(x, y) {
    const dropOffsetX = -8; // Center heart sprite over source position
    hearts.push({
        x: x + dropOffsetX,
        y,
        width: 30,
        height: 30,
        spriteSet: "heart",
        value: 1,
        spawnFrame: frame ?? 0,
        bounce: Math.random() * 2,
        life: 2000
    });
}


// ==============================
// 4. ENTITY LIBRARY
// ==============================
//
// All entity constructors include:
//   maxHealth  → equal to health for non-bosses
//   casting    → set to 0 by default
//   deadSprite → direct reference to *_dead sprite if available
//

// === Common default constants for consistency ===
const ENTITY_DIMENSIONS = {
    goblin: { w: 110, h: 110 },
    big_goblin: { w: 170, h: 170 },
    bandit: { w: 160, h: 160 },
    bandit_crossbow: { w: 160, h: 160 },
    bandit_leader: { w: 190, h: 190 },
    barricade: { w: 128, h: 128 },
    zombie: { w: 128, h: 128 },
    necromancer: { w: 170, h: 170 },
    zombie_lord: { w: 190, h: 190 }
};

function createGoblin(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.goblin.h),
        width: ENTITY_DIMENSIONS.goblin.w,
        height: ENTITY_DIMENSIONS.goblin.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 2,
        health: 1,
        maxHealth: 1,
        damage: 1,
        dead: false,
        deadSprite: images.goblin_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "goblin"
    };
}

function createBigGoblin(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.big_goblin.h, -20),
        width: ENTITY_DIMENSIONS.big_goblin.w,
        height: ENTITY_DIMENSIONS.big_goblin.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 1.5,
        health: 2,
        maxHealth: 2,
        damage: 1,
        dead: false,
        deadSprite: images.big_goblin_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 30,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "big_goblin",
        // Projectile definition for clarity
        projectile: {
            type: "acid",
            speed: 6,
            gravity: 0.2,
            castSound: "acid",
            hitSound: "acid_hit",
            damage: 1
        }
    };
}

function createBandit(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.bandit.h),
        width: ENTITY_DIMENSIONS.bandit.w,
        height: ENTITY_DIMENSIONS.bandit.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 2,
        health: 1,
        maxHealth: 1,
        damage: 1,
        dead: false,
        deadSprite: images.bandit_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "bandit"
    };
}

function createBanditCrossbow(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.bandit_crossbow.h),
        width: ENTITY_DIMENSIONS.bandit_crossbow.w,
        height: ENTITY_DIMENSIONS.bandit_crossbow.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 0,
        health: 2,
        maxHealth: 2,
        damage: 0,
        dead: false,
        deadSprite: images.bandit_crossbow_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 40,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "bandit_crossbow",
        projectile: {
            type: "crossbow_bolt",
            speed: 8,
            gravity: 0,
            castSound: "crossbow_bolt",
            hitSound: "sword_hit",
            damage: 2
        }
    };
}

function createBanditLeader(x, y) {
    return {
        x,
        y: y + 20,
        width: ENTITY_DIMENSIONS.bandit_leader.w,
        height: ENTITY_DIMENSIONS.bandit_leader.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 2,
        health: 7,
        maxHealth: 7,
        damage: 2,
        dead: false,
        deadSprite: images.bandit_leader_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 25,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.4,
        spriteSet: "bandit_leader"
    };
}

function createBarricade(x) {
    return {
        x: x - 450,
        y: staggeredGroundY(ENTITY_DIMENSIONS.barricade.h),
        width: ENTITY_DIMENSIONS.barricade.w,
        height: ENTITY_DIMENSIONS.barricade.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 0,
        health: 3,
        maxHealth: 3,
        damage: 0,
        dead: false,
        deadSprite: images.barricade_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 9999,
        castCooldown: 9999,
        castWhenOutOfRange: false,
        blockChance: 0,
        spriteSet: "barricade"
    };
}

function createZombie(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.zombie.h),
        width: ENTITY_DIMENSIONS.zombie.w,
        height: ENTITY_DIMENSIONS.zombie.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 1,
        health: 1,
        maxHealth: 1,
        damage: 1,
        dead: false,
        deadSprite: images.zombie_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 45,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.1,
        spriteSet: "zombie"
    };
}

function createNecromancer(x) {
    return {
        x,
        y: staggeredGroundY(ENTITY_DIMENSIONS.necromancer.h, -20),
        width: ENTITY_DIMENSIONS.necromancer.w,
        height: ENTITY_DIMENSIONS.necromancer.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 1.5,
        health: 2,
        maxHealth: 2,
        damage: 2,
        dead: false,
        deadSprite: images.necromancer_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 30,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.2,
        spriteSet: "necromancer"
    };
}

function createZombieLord(x, y) {
    return {
        x,
        y,
        width: ENTITY_DIMENSIONS.zombie_lord.w,
        height: ENTITY_DIMENSIONS.zombie_lord.h,
        vx: 0, vy: 0,
        facing: "left",
        speed: 1.5,
        health: 7,
        maxHealth: 7,
        damage: 2,
        dead: false,
        deadSprite: images.zombie_lord_dead ?? null,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        casting: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 40,
        castCooldown: 0,
        castWhenOutOfRange: false,
        blockChance: 0.5,
        spriteSet: "zombie_lord"
    };
}

// ==============================
// 5. DEATH HANDLING
// ==============================
//
// Handles enemy death state, corpse placement, and loot/particle spawning.
// All loot drops now use consistent RNG weighting except where forced (e.g., Big Goblin heart).
//

function handleEnemyDeath(enemy) {
    enemy.dead = true;
    enemy.attacking = false;
    enemy.vx = 0;
    enemy.deathTimer = 0;
    enemy.sprite = enemy.spriteSet + "_dead";

    const groundY = (typeof GAME_HEIGHT !== "undefined" && typeof GROUND_HEIGHT !== "undefined")
        ? GAME_HEIGHT - GROUND_HEIGHT
        : 0;

    const dropOffsetX = -8; // Center loot sprite on drop position
    const margin = 20;      // Keep loot away from level edges

    const clampDropX = (x) => {
        const leftBound = (levelBounds?.left !== undefined) ? levelBounds.left : 0;
        const rightBound = (levelBounds?.right !== undefined) ? levelBounds.right : (GAME_WIDTH || 0);
        return Math.max(leftBound + margin, Math.min(x, rightBound - margin));
    };

    // === Adjust corpse placement per enemy type
    switch (enemy.spriteSet) {
        case "goblin":
            enemy.height = 88;                          // Death sprite shorter than idle
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
            scrolls.push({
                x: clampDropX((levelBounds?.right || GAME_WIDTH) - 120),
                y: groundY - 34,
                width: 50,
                height: 34,
                spawnFrame: frame ?? 0,
                type: "magic_scroll"
            });
            break;

        case "necromancer":
            enemy.y = groundY - enemy.height + 28;
            break;

        case "zombie":
            enemy.y = groundY - enemy.height + 20;
            break;

        case "zombie_lord":
            enemy.y = groundY - enemy.height + 36;
            scrolls.push({
                x: clampDropX((levelBounds?.right || GAME_WIDTH) - 120),
                y: groundY - 34,
                width: 50,
                height: 34,
                spawnFrame: frame ?? 0,
                type: "key"
            });
            break;

        case "barricade":
            enemy.y += 40;
            break;
    }

    // Death particles at enemy position
    spawnParticles("dead", enemy.x, enemy.y);

    // === Loot Drop Logic ===
    const dropX = clampDropX(enemy.x + enemy.width + 16 + dropOffsetX);
    const dropY = groundY - 34;

    // Base coin drop chance
    if (Math.random() <= 0.75) { // 75% chance for coin
        spawnCoin(dropX, dropY);
    }

    // Heart drop logic
    if (enemy.spriteSet === "big_goblin") {
        // Always drop a heart
        spawnHeart(clampDropX(dropX + 32), dropY);
    } else if (enemy.spriteSet === "bandit_crossbow") {
        // 30% chance for heart
        if (Math.random() <= 0.3) {
            spawnHeart(clampDropX(dropX + 32), dropY);
        }
    } else {
        // Generic low chance heart drop for others
        if (Math.random() <= 0.1) {
            spawnHeart(clampDropX(dropX + 32), dropY);
        }
    }
}


// ==============================
// 6. ENTITY SPRITE SELECTION
// ==============================
//
// Chooses the correct sprite key for a given enemy based on their current
// state. Priority order ensures higher-impact states override lower ones.
//
// Priority:
//   1. Attacking
//   2. Casting (for certain ranged enemies)
//   3. Blocking
//   4. Hit flash (taking damage)
//   5. Special cases: Bandit crossbow & Zombie walk cycle
//   6. Movement (run cycle)
//   7. Idle
//

function getEnemySpriteKey(enemy, frame) {
    const spriteSet = enemy.spriteSet;

    // === Shared helper for 4-beat walk cycle (1-2-3-2 repeat)
    const getFourBeatCycle = (setName, frame) => {
        const cycle = frame % 32;
        if (cycle < 8)  return `${setName}_run1`;
        if (cycle < 16) return `${setName}_run2`;
        if (cycle < 24) return `${setName}_run3`;
        return `${setName}_run2`;
    };

    // 1. Attacking overrides everything
    if (enemy.attacking && images[`${spriteSet}_slash`]) {
        return `${spriteSet}_slash`;
    }

    // 2. Casting state (magic users only)
    if (
        (spriteSet === "big_goblin" ||
         spriteSet === "necromancer" ||
         spriteSet === "zombie_lord") &&
        enemy.casting > 0 &&
        images[`${spriteSet}_magic`]
    ) {
        return `${spriteSet}_magic`;
    }

    // 3. Blocking — use block sprite if available, else fallback to slash pose
    if (enemy.blocking) {
        if (images[`${spriteSet}_block`]) {
            return `${spriteSet}_block`;
        } else if (images[`${spriteSet}_slash`]) {
            return `${spriteSet}_slash`;
        }
    }

    // 4. Hit flash (brief frame when taking damage) — keep current pose but ensure visible
    if (enemy.hitFlash > 0) {
        if (images[`${spriteSet}_hurt`]) {
            return `${spriteSet}_hurt`;
        } else if (images[`${spriteSet}_slash`]) {
            return `${spriteSet}_slash`;
        }
    }

    // 5a. Bandit crossbow: idle/cast alternates
    if (spriteSet === "bandit_crossbow") {
        return enemy.casting > 0 ? "bandit_crossbow_2" : "bandit_crossbow_1";
    }

    // 5b. Zombie special: full 4-beat walk cycle
    if (spriteSet === "zombie" && enemy.vx !== 0) {
        return getFourBeatCycle("zombie", frame);
    }

    // 6. Standard movement — prefer 3-frame cycle if available, else 2-frame
    if (enemy.vx !== 0) {
        if (images[`${spriteSet}_run3`]) {
            return getFourBeatCycle(spriteSet, frame);
        } else if (images[`${spriteSet}_run1`] && images[`${spriteSet}_run2`]) {
            return (frame % 16 < 8) ? `${spriteSet}_run1` : `${spriteSet}_run2`;
        }
    }

    // 7. Idle fallback
    if (images[`${spriteSet}_idle`]) {
        return `${spriteSet}_idle`;
    }

    // No matching sprite found
    return null;
}


// ==============================
// 7. ENTITY DRAW FUNCTIONS
// ==============================
//
// Handles rendering of dead enemies (corpses) and active enemies
// with correct animations, facing direction, and glow effects.
// Glow color is now driven ONLY by `enemy.glow` + `glowTimer`,
// never by `isBlocking` to respect the updated block-event rule.
//

function drawDeadEnemies() {
    for (let enemy of enemies) {
        if (!enemy.dead) continue;
        const set = enemy.spriteSet;
        const spriteKey = `${set}_dead`;

        let corpseHeight = enemy.height;
        let offsetY = 0;

        // Large enemies — adjust for shorter corpse sprites
        if (["big_goblin", "necromancer", "zombie_lord"].includes(set)) {
            corpseHeight = enemy.height * 0.65;
            offsetY = enemy.height * 0.35;
        }

        // Bandit corpses sit higher
        if (set === "bandit" || set === "bandit_crossbow") {
            offsetY = 40;
        }

        // Bandit Leader custom offset
        if (set === "bandit_leader") {
            corpseHeight = enemy.height * 0.7;
            offsetY = enemy.height * 0.3;
        }

        // Big Goblin custom offset (override above for precise grounding)
        if (set === "big_goblin") {
            corpseHeight = enemy.height * 0.65;
            offsetY = enemy.height * 0.35 - 10; // Slight extra lift
        }

        if (images[spriteKey]) {
            drawTrimmedSprite(
                images[spriteKey],
                enemy.x - camera.x,
                enemy.y + offsetY,
                enemy.width,
                corpseHeight,
                enemy.facing,
                null // No glow for corpses
            );
        } else {
            ctx.fillStyle = "darkgray"; // Fallback debug box
            ctx.fillRect(enemy.x - camera.x, enemy.y + offsetY, enemy.width, corpseHeight);
        }
    }
}

function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy || enemy.dead) continue;

        // === Freeze-frame mode ===
        if (gameState !== "playing") {
            const stillImg =
                enemy.currentFrame ||
                images[`${enemy.spriteSet}_idle`] ||
                images[`${enemy.spriteSet}_run1`];
            if (stillImg) {
                drawTrimmedSprite(
                    stillImg,
                    enemy.x - camera.x,
                    enemy.y,
                    enemy.width,
                    enemy.height,
                    enemy.facing,
                    enemy.glow || null
                );
            }
            continue;
        }

        // === Normal animation path ===
        const spriteKey = getEnemySpriteKey(enemy, frame);
        const img = spriteKey ? images[spriteKey] : null;
        const facing = enemy.facing ?? "right";

        if (img) {
            enemy.currentFrame = img; // Store for freeze-frame
            drawTrimmedSprite(
                img,
                enemy.x - camera.x,
                enemy.y,
                enemy.width,
                enemy.height,
                facing,
                enemy.glow || null
            );
        } else {
            ctx.fillStyle = "red"; // Debug fallback for missing sprite
            ctx.fillRect(enemy.x - camera.x, enemy.y, enemy.width, enemy.height);
        }
    }
}


// ==============================
// 8. ENTITY HUD ELEMENTS
// ==============================

// === Bandit Leader
function drawBanditLeaderHealth() {
    const boss = enemies.find(e => e.spriteSet === "bandit_leader" && !e.dead);
    if (!boss) return;

    // Only show health bar once boss intro / cutscene is complete
    if (typeof bossIntroComplete_BanditLeader !== "undefined" && !bossIntroComplete_BanditLeader) return;
    if (typeof bossCutsceneActive !== "undefined" && bossCutsceneActive) return;

    ctx.fillStyle = "black";
    ctx.fillRect(GAME_WIDTH / 2 - 102, 48, 204, 24);

    ctx.fillStyle = "red";
    const width = (boss.health / boss.maxHealth) * 200;
    ctx.fillRect(GAME_WIDTH / 2 - 100, 50, width, 20);

    ctx.strokeStyle = "white";
    ctx.strokeRect(GAME_WIDTH / 2 - 100, 50, 200, 20);
}

// === Zombie Lord 
function drawZombieLordHealth() {
    const boss = enemies.find(e => e.spriteSet === "zombie_lord" && !e.dead);
    if (!boss) return;

    // Only show health bar once boss intro / cutscene is complete
    if (typeof bossIntroComplete_ZombieLord !== "undefined" && !bossIntroComplete_ZombieLord) return;
    if (typeof bossCutsceneActive !== "undefined" && bossCutsceneActive) return;

    ctx.fillStyle = "black";
    ctx.fillRect(GAME_WIDTH / 2 - 102, 48, 204, 24);

    ctx.fillStyle = "green";
    const width = (boss.health / boss.maxHealth) * 200;
    ctx.fillRect(GAME_WIDTH / 2 - 100, 50, width, 20);

    ctx.strokeStyle = "white";
    ctx.strokeRect(GAME_WIDTH / 2 - 100, 50, 200, 20);
}


