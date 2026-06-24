function score(prompt, keywords) {
    let s = 0;
    for (const k of keywords) {
        if (prompt.includes(k)) s++;
    }
    return s;
}

function selectPacks(prompt) {

    prompt = (prompt || "").toLowerCase();

    const packs = [];

    // MOVEMENT PACK
    const movementScore = score(prompt, ["sprint", "movement", "run", "walk", "speed"]);
    if (movementScore > 0) {
        packs.push({
            id: "movement_pack",
            name: "Movement Pack",
            priority: movementScore,
            components: [
                "movement_base",
                "sprint_system"
            ]
        });
    }

    // COMBAT PACK
    const combatScore = score(prompt, ["combat", "fight", "weapon", "damage"]);
    if (combatScore > 0) {
        packs.push({
            id: "combat_pack",
            name: "Combat Pack",
            priority: combatScore,
            components: [
                "movement_base"
            ]
        });
    }

    // UI PACK
    const uiScore = score(prompt, ["ui", "hud", "menu", "interface"]);
    if (uiScore > 0) {
        packs.push({
            id: "ui_pack",
            name: "UI Pack",
            priority: uiScore,
            components: []
        });
    }

    // DEFAULT SAFETY PACK
    if (packs.length === 0) {
        packs.push({
            id: "base_pack",
            name: "Base Pack",
            priority: 1,
            components: ["movement_base"]
        });
    }

    // SORT BY PRIORITY (MOST IMPORTANT CHANGE)
    packs.sort((a, b) => b.priority - a.priority);

    return packs;
}

module.exports = { selectPacks };
