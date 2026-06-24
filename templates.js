const templates = {

    ui_basic: {
        tags: ["ui"],
        files: [
            {
                name: "UIBase",
                type: "LocalScript",
                parent: "StarterGui",
                folder: "UI",
                source: `print("UI Loaded")`
            }
        ]
    },

    ui_health: {
        tags: ["ui", "health"],
        files: [
            {
                name: "HealthUI",
                type: "LocalScript",
                parent: "StarterGui",
                folder: "HUD",
                source: `print("Health UI Active")`
            }
        ]
    },

    movement_sprint: {
        tags: ["movement"],
        files: [
            {
                name: "Sprint",
                type: "LocalScript",
                parent: "StarterPlayerScripts",
                folder: "Movement",
                source: `print("Sprint Active")`
            }
        ]
    },

    combat_basic: {
        tags: ["combat"],
        files: [
            {
                name: "Combat",
                type: "LocalScript",
                parent: "StarterPlayerScripts",
                folder: "Combat",
                source: `print("Combat Loaded")`
            }
        ]
    }
};

module.exports = { templates };