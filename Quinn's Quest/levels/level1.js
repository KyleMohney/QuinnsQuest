window.level1 = {
    startLevel() {
        console.log("Level 1 starting...");

        // Background and music
        QuinnQuestEngine.setBackground("background.png");
        QuinnQuestEngine.playMusic("background1.mp3");
        QuinnQuestEngine.playSFX("quinn1.mp3");

        // ===== Platforms (world width: 3000) =====
        // Road covers bottom of world
        QuinnQuestEngine.createPlatform(0, 664, 3000, 56, "road.png");

        // Market stalls as jumpable objects
        QuinnQuestEngine.createPlatform(400, 580, 128, 64, "market_stall.png");
        QuinnQuestEngine.createPlatform(1200, 580, 128, 64, "market_stall.png");
        QuinnQuestEngine.createPlatform(2000, 580, 128, 64, "market_stall.png");

        // ===== Enemies =====
        // Goblins and large goblins spaced out
        QuinnQuestEngine.createEnemy("goblin", 600, 1);
        QuinnQuestEngine.createEnemy("goblin", 900, 1);
        QuinnQuestEngine.createEnemy("large_goblin", 1500, 2);
        QuinnQuestEngine.createEnemy("goblin", 1800, 1);
        QuinnQuestEngine.createEnemy("large_goblin", 2400, 2);

        // ===== Town Gate (win trigger) =====
        window.townGate = {
            x: 2800,
            y: 500,
            width: 120,
            height: 220,
            sprite: "town_gate.png"
        };
    }
};
