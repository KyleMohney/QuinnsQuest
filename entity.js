// ==============================
// ENTITY MODULE
// ==============================
// TABLE OF CONTENTS
// 1. Utility Functions
// 2. Enemy Movement & AI
// 3. Create Entity Functions
// 4. Entity State Management
// 5. Exports

// ==============================
// 1. UTILITY FUNCTIONS
// ==============================

function staggeredGroundY(height, customEmbed = 0, embedOffset = 0, buffer = 0) {
    return GAME_HEIGHT - GROUND_HEIGHT - height + (customEmbed ? -customEmbed : 35 + Math.random() * 10 + embedOffset) - buffer;
}

// ==============================
// 2. ENEMY MOVEMENT & AI
// ==============================
function enemyInView(enemy) {
    // Always return true for bandit leader to ensure health bar is visible
    if (enemy.spriteSet === "bandit_leader" || enemy.spriteSet === "zombie_lord" || enemy.spriteSet === "bandit_lord") return true;
    return (
        enemy.x >= camera.x - 100 &&
        enemy.x <= camera.x + GAME_WIDTH + 200
    );
}

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
            (enemy.spriteSet === "bandit_leader" || enemy.spriteSet === "zombie_lord" || enemy.spriteSet === "bandit_lord") &&
            !bossIntroTriggered
        ) {
            if (enemy.x - camera.x < GAME_WIDTH && gameState === "playing") {
                bossIntroTriggered = true;
                bossCutsceneActive = true;
                stopAllSounds();
                stopSound("bandit_lord_1"); // Stop Bandit Lord voice immediately at cutscene start

                if (enemy.spriteSet === "bandit_lord") {
                    // Bandit Lord cutscene: Quinn speaks, then Bandit Lord replies
                    setTimeout(() => {
                        playSound("quinn_rescue", window.volumeVoices);
                        showSubtitle("I'm here to rescue Claire!", 2200);
                        setTimeout(() => {
                            playSound("bandit_lord_1", window.volumeVoices);
                            showSubtitle("I won't let you rescue the princess!", 2200);
                            setTimeout(() => {
                                stopSound("bandit_lord_1"); // Force Bandit Lord voice to stop
                                bossCutsceneActive = false;
                            }, 1500);
                        }, 2000);
                    }, 250);
                } else {
                    const bossSound =
                        enemy.spriteSet === "zombie_lord" ? "zombie_lord" :
                        enemy.spriteSet === "bandit_leader" ? "bandit_leader" :
                        "";
                    setTimeout(() => {
                        playSound(bossSound, window.volumeVoices);
                        if (enemy.spriteSet === "zombie_lord") {
                            showSubtitle("You'll never leave this cave!", 2200);
                        } else {
                            showSubtitle("Stand and deliver!", 2200);
                        }
                        setTimeout(() => {
                            playSound(enemy.spriteSet === "zombie_lord" ? "quinn_zombie" : "quinn2", window.volumeVoices);
                            if (enemy.spriteSet === "zombie_lord") {
                                showSubtitle("I'm not afraid of you!", 2200);
                            } else {
                                showSubtitle("You wont get away with this!", 2200);
                            }
                            setTimeout(() => {
                                bossCutsceneActive = false;
                            }, 1500);
                        }, 2800); // Increased delay for more space between statements
                    }, 250);
                }
            }
        }

        // Only allow casting and projectiles for enemies in view
        // Prevent Bandit Lord from attacking or moving until in view
        if (enemy.spriteSet === "bandit_lord" && !enemyInView(enemy)) {
            enemy.vx = 0;
            enemy.attacking = false;
            enemy.casting = 0;
            continue;
        }
        if (!enemyInView(enemy) || gameState !== "playing") {
            enemy.casting = 0;
            continue;
        }

        // === Timers ===
        if (enemy.hitFlash > 0) enemy.hitFlash--;
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;
        if (enemy.castCooldown > 0) enemy.castCooldown--;

        // === Projectile casting logic ===
        if (
            enemy.spriteSet === "big_goblin" ||
            enemy.spriteSet === "bandit_crossbow" ||
            enemy.spriteSet === "necromancer" ||
            enemy.spriteSet === "zombie_lord" ||
            enemy.spriteSet === "bandit_lord"
        ) {
            if (enemy.casting > 0) {
                enemy.casting++;
                const castFrame = Math.floor(30 * 0.4);
                if (enemy.casting === castFrame) {
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
                    else if (enemy.spriteSet === "necromancer" || enemy.spriteSet === "zombie_lord" || enemy.spriteSet === "bandit_lord") {
                        type = "evil_magic";
                        vx = enemy.facing === "left" ? -3 : 3;
                        xOffset = enemy.facing === "left" ? -32 : enemy.width + 10;
                        // Increase Necromancer magic size by 15%
                        if (enemy.spriteSet === "necromancer") {
                            width = Math.round(72 * 1.15);
                            height = Math.round(72 * 1.15);
                        } else {
                            width = 72;
                            height = 72;
                        }
                        damage = 2;
                        // Lower Bandit Lord's magic spawn Y so it can hit the player
                        var magicYOffset = (enemy.spriteSet === "bandit_lord")
                            ? enemy.height - height - 24 // Near feet
                            : enemy.height / 2 - height / 2;
                    }

                    projectiles.push({
                        type,
                        owner: "enemy",
                        x: enemy.x + xOffset,
                        y: enemy.y + magicYOffset,
                        vx,
                        vy: 0,
                        width,
                        height,
                        damage,
                        spawnFrame: frame
                    });

                    playSound(type, window.volumeSFX);
                }

                // Speed up Bandit Lord's animation and casting cycle
                let fastCastLimit = (enemy.spriteSet === "bandit_lord") ? 35 : 60;
                if (enemy.casting >= fastCastLimit) {
                    enemy.casting = 0;
                    if (enemy.spriteSet === "big_goblin") {
                        enemy.castCooldown = Math.floor(180 * 0.4);
                    } else if (enemy.spriteSet === "bandit_crossbow") {
                        enemy.castCooldown = Math.floor(120 * 0.4);
                    } else if (enemy.spriteSet === "necromancer") {
                        enemy.castCooldown = Math.floor(150 * 0.4);
                    } else if (enemy.spriteSet === "zombie_lord") {
                        enemy.castCooldown = Math.floor(150 * 0.4);
                    } else if (enemy.spriteSet === "bandit_lord") {
                        enemy.castCooldown = Math.floor(60 * 0.4); // much more aggressive
                    } else {
                        enemy.castCooldown = Math.floor(150 * 0.4); // fallback
                    }
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
                else if (enemy.spriteSet === "bandit_lord") enemy.sprite = "necromancer_magic";
                else enemy.sprite = "idle"; // bandit_crossbow
                continue;
            }
        }

        // === Slash / Melee Attack Phase ===
        if (enemy.attackTimer > 0) {
            enemy.attackTimer--;
            // Prevent movement while attacking
            enemy.vx = 0;
            // When attackTimer ends, reset sprite to idle or run
            if (enemy.attackTimer === 0) {
                if (enemy.vx !== 0) {
                    enemy.sprite = "run";
                } else {
                    enemy.sprite = "idle";
                }
                enemy.attacking = false;
            }
            continue;
        }

        // === Fallback: Ensure idle sprite between attacks/casts ===
        if (!enemy.attacking && enemy.casting === 0 && enemy.attackTimer === 0) {
            if (enemy.vx === 0 && enemy.sprite !== "idle") {
                enemy.sprite = "idle";
            }
            // Ensure Necromancer always defaults to idle between attacks/casts
            if (enemy.spriteSet === "necromancer" && enemy.sprite !== "idle") {
                enemy.sprite = "idle";
            }
        }

        if (enemyInRange(enemy) && enemyReadyToAttack(enemy)) {
            enemy.sprite = "slash";
            enemy.attacking = true;
            enemy.attackCooldown = enemy.attackRate ?? 45;
            // Use enemy's existing attackTimer value
            switch (enemy.spriteSet) {
                case "goblin":
                    enemy.attackTimer = 12;
                    break;
                case "big_goblin":
                    enemy.attackTimer = 16;
                    break;
                case "bandit":
                    enemy.attackTimer = 14;
                    break;
                case "bandit_crossbow":
                    enemy.attackTimer = 10;
                    break;
                case "bandit_leader":
                    enemy.attackTimer = 20;
                    break;
                case "bandit_lord":
                    enemy.attackTimer = 24;
                    break;
                case "hound":
                    enemy.attackTimer = 18;
                    break;
                case "necromancer":
                    enemy.attackTimer = 8;
                    break;
                case "zombie":
                    enemy.attackTimer = 8;
                    break;
                case "zombie_lord":
                    enemy.attackTimer = 20;
                    break;
                default:
                    enemy.attackTimer = 15;
                    break;
            }

            if (player.isBlocking) {
                playSound("block", window.volumeSFX);
                spawnParticles("block", player.x, player.y);
                player.glow = "blue";
                player.glowTimer = 10;
                player.vx -= 4 * (enemy.x < player.x ? -1 : 1);
            } else {
                if (Math.random() < (enemy.blockChance || 0)) {
                    enemy.blocking = true;
                    playSound("block", window.volumeSFX);
                    spawnParticles("block", enemy.x, enemy.y);
                    enemy.glow = "white";
                    enemy.glowTimer = 10;
                } else {
                    enemy.blocking = false;
                    playSound("slash-2", window.volumeSFX);
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
        // === Non-combat movement logic ===
        if (!enemy.attacking && !(enemy.casting > 0)) {
            window.updateEnemyMovement(enemy, player, barricades, enemies, dt);
        }
    }
}

// Handles movement, facing, barricade logic, and positioning for enemies.
window.updateEnemyMovement = function(enemy, player, barricades, enemies, dt) {
    // Dynamic flip based on player position
    if (enemy.spriteSet !== "barricade") {
        enemy.facing = (player.x < enemy.x) ? "left" : "right";
    }

    // Lock barricades in place (skip movement logic)
    if (enemy.spriteSet === "barricade") {
        enemy.vx = 0;
        enemy.vy = 0;
        return;
    }

    // Prevent Bandit Lord from moving until he is in frame
    if (enemy.spriteSet === "bandit_lord" && !enemyInView(enemy)) {
        enemy.vx = 0;
        return;
    }

    // Movement logic
    const dir = player.x < enemy.x ? -1 : 1;
    const nextX = enemy.x + dir * enemy.speed * dt;
    const nextMidX = nextX + enemy.width / 2;
    const playerMidX = player.x + player.width / 2;
    const dist = Math.abs(nextMidX - playerMidX);
    const stopBuffer = 16;

    if (dist > stopBuffer) {
        enemy.x = nextX;
        // Remove Bandit Lord's laughter from movement
    }

    enemy.vx = dir * enemy.speed;
    enemy.attacking = false;

    // Prevent passing through barricades (right half is a hard edge, left side allows overlap)
    // Prevent passing through barricades (reverted to block from both sides)
    // ...existing code...

    // Soft push enemies off Quinn
    const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
    if (Math.abs(dx) < 4) {
        enemy.x += dx >= 0 ? 1.5 : -1.5;
    }

    // Prevent overlapping other enemies
    for (let other of enemies) {
        if (other !== enemy && !other.dead) {
            const dx = enemy.x - other.x;
            if (Math.abs(dx) < enemy.width && Math.abs(enemy.y - other.y) < enemy.height) {
                enemy.x += dx > 0 ? 1 : -1;
            }
        }
    }
};

window.updateEnemyMovement = function(enemy, player, barricades, enemies, dt) {
    // === Lock barricades in place (skip movement logic) ===
    if (enemy.spriteSet === "barricade") {
        enemy.vx = 0;
        enemy.vy = 0;
        return;
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
        // Remove Bandit Lord's laughter from movement. Only play at intro and first appearance.
        if (enemy.spriteSet === "bandit_lord" && !enemy.laughPlayed && enemyInView(enemy)) {
            playSound("bandit_lord_cackle", window.volumeSFX);
            enemy.laughPlayed = true;
        }
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
};

// ==============================
// 3. CREATE ENTITY FUNCTIONS
// ==============================

function createGoblin(x) {
    return {
        x,
        y: staggeredGroundY(110) - 30,
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

function createBigGoblin(x) {
    return {
        x,
        y: staggeredGroundY(170, -20) - 20,
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

function createBandit(x) {
    return {
        x,
        y: staggeredGroundY(160) - 20,
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

function createBanditCrossbow(x) {
    return {
        x,
        y: staggeredGroundY(160) - 20,
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

function createBanditLeader(x, y) {
    return {
        x,
        y: y, // Remove offset so spawn matches road height exactly
        width: 190,
        height: 190,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 2,
    health: 10,
    maxHealth: 10,
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
        laughPlayed: null // Track last laugh frame
    };
}

function createBanditLord(x, y) {
    return {
    x,
    y: y - 120, // Move up by 120 pixels (70 + 30 + 20)
        width: 384, // 128 * 3
        height: 384, // 128 * 3
        vx: 0,
        vy: 0,
        facing: "left",
    speed: 4.004, // Increased by another 30%
    health: 15,
    maxHealth: 15,
        damage: 3,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 36,
        castCooldown: 0,
        castWhenOutOfRange: true,
        blockChance: 0.5,
        spriteSet: "bandit_lord",
    };
}

function createBarricade(x) {
    return {
    x: x, // No offset; spawn at specified X
    // Use true sprite size and flush with road/grass boundary
    // Make barricade wider and positioned lower
    width: 130, // Increased by 30% for better collision
    height: images.barricade ? Math.round(images.barricade.naturalHeight * 1.3) : Math.round(130 * 1.3),
    // Position barricade so its bottom is flush with the top of the road
    y: (() => {
        // In level 4, road is raised by 10px, so raise barricade by same amount
        let roadYOffset = (typeof currentLevel !== 'undefined' && currentLevel === 4) ? 10 : 0;
    return GAME_HEIGHT - GROUND_HEIGHT - (images.barricade ? images.barricade.naturalHeight : 120) + 10 - roadYOffset - 20;
    })(), // Raised by 20px for better alignment, adjust for level 4
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

function createZombie(x) {
    return {
        x,
        y: staggeredGroundY(141) - 22,
        width: 141, // 128 * 1.1
        height: 141, // 128 * 1.1
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

function createNecromancer(x) {
    return {
        x,
    y: staggeredGroundY(150, -15) - 10,
    width: 150,
    height: 150,
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

function createZombieLord(x, y) {
    return {
        x,
        y,
        width: 275, // 250 * 1.1
        height: 275, // 250 * 1.1
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 1.5,
    health: 10,
    maxHealth: 10,
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

function createHound(x, y) {
    return {
        x: x,
        y: y - 10,
        width: 180,
        height: 120,
        vx: 0,
        vy: 0,
        facing: "left",
        speed: 3.2,
    health: 10,
    maxHealth: 10,
        damage: 2,
        dead: false,
        hitFlash: 0,
        blocking: false,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        attackRate: 20,
        castCooldown: 0,
        blockChance: 0.3,
        spriteSet: "hound",
    };
}

// ==============================
// 4. ENTITY STATE MANAGEMENT
// ==============================
// Enemy State Management (moved from engine.js)
function handleEnemyDeath(enemy) {
    enemy.dead = true;
    enemy.attacking = false;
    enemy.vx = 0;
    enemy.deathTimer = 0;
    enemy.sprite = enemy.spriteSet + "_dead";

    let groundY = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_FOOT_OFFSET;
    // Use enemy facing to spawn pickups away from Quinn
    const dropOffsetX = (enemy.facing === 'left') ? -64 : 64;
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
    const scrollXBoss = levelBounds.right - 120;
    const scrollYBoss = GAME_HEIGHT - GROUND_HEIGHT - 34;

    let scrollY = groundY - 34;
    scrollY = Math.max(0, Math.min(scrollY, GAME_HEIGHT - GROUND_HEIGHT - 34));
    scrolls.push({
        x: scrollXBoss,
        y: scrollY,
        width: 50,
        height: 34,
        spawnFrame: frame
    });
    break;

        case "bandit_lord":
            // Only spawn Claire if currentLevel is 6
            if (typeof currentLevel !== 'undefined' && currentLevel === 6) {
                handleBanditLordDefeat(enemy);
            }
            break;

        case "zombie":
            enemy.y = groundY - enemy.height + 20;
            break;
            enemy.y = groundY - enemy.height + 36;
            scrolls.push({
                x: clampDropX(enemy.x + enemy.width + 20 + dropOffsetX),
                y: enemy.y,
                width: 50,
                height: 34,
                spawnFrame: frame
            });
            break;
        case "zombie_lord":
            enemy.y = groundY - enemy.height + 36;
            // Force key to spawn just left of invisible wall for Level 4
            const keyXBoss = levelBounds.right - 120;
            const keyYBoss = GAME_HEIGHT - GROUND_HEIGHT - 34;

            let keyY = groundY - 34;
            keyY = Math.max(0, Math.min(keyY, GAME_HEIGHT - GROUND_HEIGHT - 34));
            keys.push({
                x: keyXBoss,
                y: keyY,
                width: 50,
                height: 34,
                spawnFrame: frame
            });
            break;
        case "necromancer":
            enemy.y = groundY - enemy.height + 36;
            // Do not spawn scrolls for necromancer
            break;
        case "barricade":
            enemy.y += 40;
            break;
        case "hound":
            enemy.y = groundY - enemy.height + 24;
            playSound("hound_dead", window.volumeSFX);
            spawnHeart(clampDropX(enemy.x + enemy.width / 2), groundY - 30);
            break;
        default:
            // End-of-level scroll (unchanged logic)
            // PATCH: Do not spawn scrolls for Level 6
            if (typeof currentLevel !== 'undefined' && currentLevel === 6) break;
            const scrollX = levelBounds.right - 100;
            scrolls.push({
                x: scrollX,
                y: groundY - 34,
                width: 50,
                height: 34,
                spawnFrame: frame
            });
            break;
    }

    spawnParticles("dead", enemy.x, enemy.y);

    // === Regular coin/heart drops (spawn at enemy's X, always on ground) ===
    const pickupX = clampDropX(enemy.x + enemy.width / 2 - 12); // center at enemy
    const pickupY = groundY - 25; // ground-aligned for coin
    spawnCoin(pickupX, pickupY);

    if (enemy.spriteSet === "big_goblin" || enemy.spriteSet === "bandit_crossbow" || enemy.spriteSet === "hound") {
        spawnHeart(clampDropX(pickupX + 32), groundY - 30); // ground-aligned for heart
    }
}

function handleBanditLordDefeat(enemy) {
    // Show Bandit Lord death subtitle, then Quinn's victory
    setTimeout(function() {
        showSubtitle("No, you've defeated me.", 1800);
        setTimeout(function() {
            playSound("quinn-win.mp3", window.volumeVoices);
            showSubtitle("I won. Let's go home, Claire.", 2200);
        }, 1800);
    }, 500); // Start after Bandit Lord death sound
    // Spawn Claire at far right when Bandit Lord is defeated
    pickups = pickups || [];
    // Use same logic as scroll/key placement: far right, flush with ground
    pickups.push({
        type: "claire",
        x: levelBounds.right - Math.round(120 * 1.15) - 32, // 15% larger
        y: GAME_HEIGHT - GROUND_HEIGHT - Math.round(120 * 1.15),
        width: Math.round(120 * 1.15),
        height: Math.round(120 * 1.15),
        spawnFrame: frame,
        collected: false,
        winState: true // Show happy sprite immediately
    });
}

// ==============================
// 5. EXPORTS
// ==============================
window.createGoblin = createGoblin;
window.createBigGoblin = createBigGoblin;
window.createBandit = createBandit;
window.createBanditCrossbow = createBanditCrossbow;
window.createBanditLeader = createBanditLeader;
window.createBanditLord = createBanditLord;
window.createBarricade = createBarricade;
window.createZombie = createZombie;
window.createNecromancer = createNecromancer;
window.createZombieLord = createZombieLord;
window.createHound = createHound;
window.handleEnemyDeath = handleEnemyDeath;
window.handleBanditLordDefeat = handleBanditLordDefeat;

