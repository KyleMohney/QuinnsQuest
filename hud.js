// ===============================
// HUD & UI SETTINGS
// ===============================

// ===============================
// TABLE OF CONTENTS
// ===============================
// 1. Utility Functions (roundRect, roundRectStroke, drawGoldSlider, drawCircularMeter)
// 2. Draw HUD
// 3. Draw Settings Panel
// 4. Settings Input Handling
// 5. Buttons Click Logic
// 6. Exports

// ===============================
// 1. Utility Functions
// ===============================
/**
 * Draws a circular meter (health, magic, coins) on the HUD.
 * @param {Object} opts - Options for drawing the meter.
 * @param {CanvasRenderingContext2D} opts.ctx - Canvas context.
 * @param {number} opts.centerX - X center.
 * @param {number} opts.centerY - Y center.
 * @param {number} opts.radius - Outer radius.
 * @param {number} opts.thickness - Arc thickness.
 * @param {number} opts.percent - Fill percent (0-1).
 * @param {string} [opts.label] - Emoji label or null.
 * @param {string} [opts.value] - Value text below meter.
 * @param {function} [opts.color] - Function(percent) => color string.
 * @param {function} [opts.gradient] - Function(percent) => [startColor, endColor].
 * @param {Image} [opts.coinImg] - Optional coin image for coin meter.
 */
function drawCircularMeter({ ctx, centerX, centerY, radius, thickness, percent, label, value, color, gradient, coinImg }) {
    ctx.save();
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#222';
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw progress arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * Math.max(0, Math.min(1, percent));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = thickness;
    // Gradient or solid color
    if (gradient) {
        const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
        const [startCol, endCol] = gradient(percent);
        grad.addColorStop(0, startCol);
        grad.addColorStop(1, endCol);
        ctx.strokeStyle = grad;
    } else if (color) {
        ctx.strokeStyle = color(percent);
    } else {
        ctx.strokeStyle = '#FFD700';
    }
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw label (emoji or coin image)
    if (coinImg && coinImg.complete) {
        ctx.drawImage(coinImg, centerX - radius/2, centerY - radius/2, radius, radius);
    } else if (label) {
        ctx.font = `${Math.floor(radius * 0.9)}px Segoe UI Emoji, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(label, centerX, centerY);
    }

    // Draw value below meter
    if (value) {
        ctx.font = `${Math.floor(radius * 0.38)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Use color function if provided, else gold
        ctx.fillStyle = color ? color(percent) : '#FFD700';
        ctx.fillText(value, centerX, centerY + radius * 1.18);
    }
    ctx.restore();
}

// ===============================
// 2. Draw HUD
// ===============================
function drawHUD(ctx, canvas, player, images) {
    // === Boss Health Bar (Zombie Lord & Bandit Leader) ===
    if (window.activeBoss && window.activeBoss.maxHealth && window.activeBoss.health > 0) {
        const bossBarWidth = 420;
        const bossBarHeight = 32;
        const bossBarX = (canvas.width - bossBarWidth) / 2;
        const bossBarY = centerY + 140; // Lowered further below HUD
        const percent = window.activeBoss.health / window.activeBoss.maxHealth;
        ctx.save();
        ctx.fillStyle = '#222';
        ctx.fillRect(bossBarX, bossBarY, bossBarWidth, bossBarHeight);
        ctx.fillStyle = percent > 0.6 ? '#44FF44' : percent > 0.3 ? '#FFAA00' : '#FF4444';
        ctx.fillRect(bossBarX + 3, bossBarY + 3, (bossBarWidth - 6) * percent, bossBarHeight - 6);
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText(window.activeBoss.name + `  ${window.activeBoss.health}/${window.activeBoss.maxHealth}`, bossBarX + bossBarWidth / 2, bossBarY + bossBarHeight - 8);
        ctx.restore();
    }
    if (!player || !ctx) return;
    const meterSpacing = 240;
    const startX = (canvas.width / 2) - meterSpacing;
    const centerY = 120;
    drawCircularMeter({
        ctx,
        centerX: startX,
        centerY,
        radius: 70,
        thickness: 16,
        percent: (player.health || player.maxHealth) / (player.maxHealth || 10),
        label: '❤️',
        value: `${player.health || 10}/${player.maxHealth || 10}`,
        color: percent => percent > 0.6 ? '#44FF44' : percent > 0.3 ? '#FFAA00' : '#FF4444',
        gradient: percent => percent > 0.6 ? ['#88FF88','#44DD44'] : percent > 0.3 ? ['#FFDD44','#FF9900'] : ['#FF8888','#DD4444']
    });
    drawCircularMeter({
        ctx,
        centerX: startX + meterSpacing,
        centerY,
        radius: 70,
        thickness: 16,
        percent: 1 - ((player.magicCooldown || 0) / (player.magicCooldownMax || 260)),
        label: '🔥',
        value: (player.magicCooldown || 0) <= 0 ? 'READY' : `${Math.ceil((player.magicCooldown || 0)/60)}s`,
        color: percent => percent >= 1 ? '#FF8800' : '#6688CC',
        gradient: percent => percent >= 1 ? ['#FFFFAA','#FF4422'] : ['#AACCFF','#6688CC']
    });
    drawCircularMeter({
        ctx,
        centerX: startX + meterSpacing * 2,
        centerY,
        radius: 70,
        thickness: 16,
        percent: 1,
        label: images.coin && images.coin.complete ? null : '🪙',
        value: `${window.coinCount || 0}`,
        color: () => '#FFD700',
        gradient: () => ['#FFFF88','#FFA500'],
        coinImg: images.coin
    });

        // === HERO MODE INDICATOR ===
        if (player.invincible) {
            ctx.save();
            ctx.font = "bold 28px Arial Black";
            ctx.textAlign = "left";
            ctx.fillStyle = "#FFD700";
            // Position to the right of the health bars
            const heroX = startX + meterSpacing * 3 + 24;
            const heroY = centerY + 10;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.fillText("HERO MODE", heroX, heroY);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
}

// ===============================
// 3. Draw Settiongs Panel
// ===============================
function drawSettingsPanel(ctx, canvas, images, volumes) {
    ctx.save();
    ctx.globalAlpha = 0.97;
    // === Make panel more compact
    const plateWidth = Math.max(420, Math.min(canvas.width * 0.45, 600));
    const plateHeight = Math.max(260, Math.min(canvas.height * 0.32, 340));
    const plateX = (canvas.width - plateWidth) / 2;
    const plateY = (canvas.height - plateHeight) / 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#222';
    roundRect(ctx, plateX, plateY, plateWidth, plateHeight, 32);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD700';
    roundRectStroke(ctx, plateX, plateY, plateWidth, plateHeight, 32);
    ctx.globalAlpha = 1.0;

    // === Draw close button (bottom left, visible)
    const btnW = Math.max(56, plateWidth * 0.13);
    const btnH = btnW;
    const btnX = plateX + 18;
    // Lower close button so it sits in the corner
    const btnY = plateY + plateHeight - btnH - 18;
    let closeBtnActive = window.closeBtnActive || false;
    let closeBtnImg = images.close1 && images.close1.complete ? images.close1 : null;
    if (closeBtnActive && images.close2 && images.close2.complete) {
        closeBtnImg = images.close2;
    }
    if (closeBtnImg) {
        ctx.drawImage(closeBtnImg, btnX, btnY, btnW, btnH);
    }
    window.closeBtnRegion = { x: btnX, y: btnY, width: btnW, height: btnH };

    // === Title
    ctx.textAlign = "left";
    ctx.fillText("SETTINGS", plateX + 28, plateY + 48);

    // === Sliders
    const sliderStartY = plateY + 90;
    const sliderWidth = Math.min(160, plateWidth - 80);
    const sliderSpacing = 56;
    drawGoldSlider(ctx, "Music", volumes.music, sliderStartY, plateX + 36, sliderWidth);
    drawGoldSlider(ctx, "SFX", volumes.sfx, sliderStartY + sliderSpacing, plateX + 36, sliderWidth);
    drawGoldSlider(ctx, "Voices", volumes.voices, sliderStartY + sliderSpacing * 2, plateX + 36, sliderWidth);
    // Update slider regions for event handling
    updateSliderRegions(plateX, plateY, sliderWidth, sliderStartY, sliderSpacing);
    
    // === Controls
    const controlsX = plateX + plateWidth / 2 + 10;
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial Black";
    ctx.textAlign = "left";
    ctx.fillText("CONTROLS", controlsX, plateY + 48);
    ctx.fillStyle = "#00FF00";
    ctx.font = "16px Arial";
    const controlsListStartY = plateY + 90;
    const controls = [
        "← / → : Move left/right",
        "↑ : Block",
        "↓ : Melee attack",
        "Space : Jump",
        "Shift : Cast Fireball",
        "I : Toggle Invincibility",
        "P : Pause",
        "ESC : Settings",
        "T : Return to Title"
    ];
    for (let i = 0; i < controls.length; i++) {
        ctx.fillText(controls[i], controlsX + 12, controlsListStartY + i * 22);
    }
    ctx.restore();
}
// Draws a filled rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// Draws a stroked rounded rectangle
function roundRectStroke(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

// Draws a horizontal gold slider
function drawGoldSlider(ctx, label, value, y, x, width) {
    ctx.save();
    // Draw slider bar
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Draw knob
    const knobX = x + value * width;
    ctx.beginPath();
    ctx.arc(knobX, y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label and value
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 18);
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(value * 100) + '%', x + width, y - 18);
    ctx.restore();
}

// ===============================
// 4. Settings Input Handling
// ===============================

// Track which slider is being dragged
let activeSlider = null;
let sliderRegions = [];

function isSettingsPanelOpen() {
    return window.showSettingsPanel;
}

// ===============================
// 5. Button Click Logic
// ===============================
// Handles Start, Retry, Next Level, and Close buttons
window.addEventListener('DOMContentLoaded', function() {
    // Remove recursive assignment; rely on engine.js for window.startNextLevel
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    canvas.addEventListener('click', function(evt) {
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        // --- Start Button ---
        if (typeof gameState !== 'undefined' && gameState === 'title') {
            const buttonWidth = 200, buttonHeight = 80;
            const startButtonX = (canvas.width - buttonWidth) / 2;
            const startButtonY = canvas.height - buttonHeight - 20;
            if (
                x >= startButtonX && x <= startButtonX + buttonWidth &&
                y >= startButtonY && y <= startButtonY + buttonHeight &&
                typeof startClicked !== 'undefined' && !startClicked
            ) {
                startClicked = true;
                if (typeof playSound === 'function') playSound('click', volumeSFX);
                setTimeout(() => {
                    // Transition to Chapter 1 screen (levelstart state)
                    if (typeof gameState !== 'undefined') gameState = 'levelstart';
                    if (typeof currentLevel !== 'undefined') currentLevel = 1;
                }, 500);
                return;
            }
        }

        // --- Retry Button ---
        if (typeof gameState !== 'undefined' && gameState === 'gameover') {
            const buttonWidth = 170, buttonHeight = 300; // Height set to 300, click region matches
            const retryButtonX = (canvas.width - buttonWidth) / 2;
            const retryButtonY = (canvas.height - buttonHeight) / 2;
            if (
                x >= retryButtonX && x <= retryButtonX + buttonWidth &&
                y >= retryButtonY && y <= retryButtonY + buttonHeight &&
                typeof retryClicked !== 'undefined' && !retryClicked
            ) {
                retryClicked = true;
                if (typeof playSound === 'function') playSound('click', volumeSFX);
                setTimeout(() => {
                    if (typeof restartLevel === 'function') restartLevel();
                }, 300);
                return;
            }
        }

        // --- Next Level Button ---
        if (typeof gameState !== 'undefined' && gameState === 'levelstart') {
            // Use new button bounds from engine.js
            const bounds = window.nextLevelButtonBounds || { x: canvas.width - 240, y: canvas.height - 100, width: 200, height: 80 };
            if (
                x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height &&
                typeof nextLevelClicked !== 'undefined' && !nextLevelClicked
            ) {
                nextLevelClicked = true;
                if (typeof playSound === 'function') playSound('click', volumeSFX);
                setTimeout(() => {
                    if (typeof startNextLevel === 'function') startNextLevel();
                }, 1000);
                return;
            }
        }

        // --- Close Button (Settings Panel) ---
        if (typeof isSettingsPanelOpen === 'function' && isSettingsPanelOpen()) {
            const r = window.closeBtnRegion;
            if (
                r && x >= r.x && x <= r.x + r.width &&
                y >= r.y && y <= r.y + r.height
            ) {
                window.closeBtnActive = true;
                if (typeof playSound === 'function') playSound('click', window.volumeSFX);
                setTimeout(() => {
                    window.closeBtnActive = false;
                    window.showSettingsPanel = false;
                    if (typeof gameState !== 'undefined') gameState = 'playing';
                }, 120);
                return;
            }
        }

        // --- Sliders ---
        for (let region of sliderRegions) {
            if (
                x >= region.x && x <= region.x + region.width &&
                y >= region.y && y <= region.y + region.height
            ) {
                activeSlider = region.name;
                updateSliderValue(x, region);
                break;
            }
        }
    });
    canvas.addEventListener('mousemove', function(e) {
        if (!isSettingsPanelOpen() || !activeSlider) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const region = sliderRegions.find(r => r.name === activeSlider);
        if (region) {
            updateSliderValue(mouseX, region);
        }
    });
    canvas.addEventListener('mouseup', function() {
        activeSlider = null;
    });
});

function updateSliderRegions(plateX, plateY, sliderWidth, sliderStartY, sliderSpacing) {
    sliderRegions = [
        { name: 'music', x: plateX + 36, y: sliderStartY, width: sliderWidth, height: 24 },
        { name: 'sfx', x: plateX + 36, y: sliderStartY + sliderSpacing, width: sliderWidth, height: 24 },
        { name: 'voices', x: plateX + 36, y: sliderStartY + sliderSpacing * 2, width: sliderWidth, height: 24 }
    ];
}

function updateSliderValue(mouseX, region) {
    let percent = (mouseX - region.x) / region.width;
    percent = Math.max(0, Math.min(1, percent));
    if (region.name === 'music') {
        window.volumeMusic = percent;
    } else if (region.name === 'sfx') {
        window.volumeSFX = percent;
    } else if (region.name === 'voices') {
        window.volumeVoices = percent;
    }
}

// ===============================
// 6. Exports
// ===============================
window.drawHUD = drawHUD;
window.drawSettingsPanel = drawSettingsPanel;