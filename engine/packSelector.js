const { detectConflicts } = require("./conflicts");

function selectPacks(prompt) {

    prompt = (prompt || "").toLowerCase();

    let packs = [];

    // MOVEMENT INTELLIGENCE
    if (prompt.includes("sprint") || prompt.includes("movement") || prompt.includes("run")) {
        packs.push({
            id: "movement_pack",
            name: "Movement Pack",
            priority: 3,
            components: [
                "movement_base",
                "sprint_system",
                "stamina_system"
            ]
        });
    }

    // COMBAT INTELLIGENCE
    if (prompt.includes("combat") || prompt.includes("fight")) {
        packs.push({
            id: "combat_pack",
            name: "Combat Pack",
            priority: 2,
            components: [
                "movement_base",
                "combat_system"
            ]
        });
    }

    // UI INTELLIGENCE
    if (prompt.includes("ui") || prompt.includes("hud")) {
        packs.push({
            id: "ui_pack",
            name: "UI Pack",
            priority: 1,
            components: [
                "ui_base",
                "damage_popup"
            ]
        });
    }

    if (packs.length === 0) {
        packs.push({
            id: "base_pack",
            name: "Base Pack",
            priority: 1,
            components: ["movement_base"]
        });
    }

    // SORT BY PRIORITY
    packs.sort((a, b) => b.priority - a.priority);

    return packs;
}

module.exports = { selectPacks };
