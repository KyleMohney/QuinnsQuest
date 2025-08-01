window.level2 = {
    startLevel() {
        console.log("Level 2 starting...");

        // Set background image
        QuinnQuestEngine.setBackground("background2.png");

        // Play background music and Quinn's voice line
        QuinnQuestEngine.playMusic("background2.mp3");
        QuinnQuestEngine.playSFX("quinn2.mp3");

        // Platforms
        QuinnQuestEngine.createPlatform(0, 664, 1280, 56, "road.png");
        QuinnQuestEngine.createPlatform(250, 550, 128, 64, "market_stall.png");
        QuinnQuestEngine.createPlatform(850, 550, 128, 64, "market_stall.png");

        // Enemies: bandits and bandit leader
        QuinnQuestEngine.createEnemy("bandit", 400, 1);
        QuinnQuestEngine.createEnemy("bandit", 600, 1);
        QuinnQuestEngine.createEnemy("crossbow", 800, 2);

        // Bandit leader with scroll (boss)
        QuinnQuestEngine.createEnemy("leader", 1000, 4);

        // Play leader's voice when in view (delayed)
        setTimeout(() => {
            QuinnQuestEngine.playSFX("bandit_leader.mp3");
        }, 3000);
    }
};
