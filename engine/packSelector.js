function selectPack(prompt) {

    prompt = (prompt || "").toLowerCase();

    // MOVEMENT PACK
    if (prompt.includes("sprint") || prompt.includes("movement") || prompt.includes("run")) {
        return {
            id: "movement_pack",
            name: "Movement Pack",
            components: [
                "movement_base",
                "sprint_system"
            ]
        };
    }

    // COMBAT PACK
    if (prompt.includes("combat") || prompt.includes("fight")) {
        return {
            id: "combat_pack",
            name: "Combat Pack",
            components: [
                "movement_base"
            ]
        };
    }

    // DEFAULT PACK (NEVER FAILS)
    return {
        id: "basic_pack",
        name: "Basic Pack",
        components: [
            "movement_base"
        ]
    };
}

module.exports = { selectPack };
