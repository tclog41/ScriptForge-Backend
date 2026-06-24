function score(prompt, keys) {
    let s = 0;
    for (const k of keys) {
        if (prompt.includes(k)) s++;
    }
    return s;
}

function selectPacks(prompt) {

    prompt = (prompt || "").toLowerCase();

    const packs = [];

    const movement = score(prompt, ["sprint", "movement", "run", "speed"]);
    const combat = score(prompt, ["combat", "fight", "damage"]);
    const ui = score(prompt, ["ui", "hud", "menu"]);

    if (movement > 0) {
        packs.push({
            id: "movement_pack",
            name: "Movement Pack",
            priority: movement,
            components: [
                "movement_base",
                "sprint_system",
                "stamina_system"
            ]
        });
    }

    if (combat > 0) {
        packs.push({
            id: "combat_pack",
            name: "Combat Pack",
            priority: combat,
            components: [
                "movement_base",
                "combat_system"
            ]
        });
    }

    if (ui > 0) {
        packs.push({
            id: "ui_pack",
            name: "UI Pack",
            priority: ui,
            components: [
                "ui_base"
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

    packs.sort((a, b) => b.priority - a.priority);

    return packs;
}

module.exports = { selectPacks };
