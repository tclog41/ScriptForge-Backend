function selectPack(prompt) {

    prompt = prompt.toLowerCase();

    if (prompt.includes("sprint") || prompt.includes("movement")) {
        return {
            id: "movement_pack",
            name: "Movement Pack",
            components: [
                "movement_base",
                "sprint_system",
                "crouch_system"
            ]
        };
    }

    if (prompt.includes("combat")) {
        return {
            id: "combat_pack",
            name: "Combat Pack",
            components: [
                "movement_base"
            ]
        };
    }

    return {
        id: "basic_pack",
        name: "Basic Pack",
        components: ["movement_base"]
    };
}

module.exports = { selectPack };
