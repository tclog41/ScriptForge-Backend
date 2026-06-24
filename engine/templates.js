const templates = {

    movement_base: {
        id: "movement_base",
        name: "Movement Base",
        category: "Movement",
        dependencies: [],
        build: () => `print("Movement Base Loaded")`
    },

    sprint_system: {
        id: "sprint_system",
        name: "Sprint System",
        category: "Movement",
        dependencies: ["movement_base"],
        build: () => `
local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

local function hum()
	return (player.Character or player.CharacterAdded:Wait()):WaitForChild("Humanoid")
end

UIS.InputBegan:Connect(function(i,g)
	if g then return end
	if i.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = 24
	end
end)

UIS.InputEnded:Connect(function(i)
	if i.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = 16
	end
end)
`
    },

    crouch_system: {
        id: "crouch_system",
        name: "Crouch System",
        category: "Movement",
        dependencies: ["movement_base"],
        build: () => `print("Crouch System")`
    },

    stamina_system: {
        id: "stamina_system",
        name: "Stamina System",
        category: "Movement",
        dependencies: ["movement_base"],
        build: () => `print("Stamina System")`
    },

    combat_system: {
        id: "combat_system",
        name: "Combat System",
        category: "Combat",
        dependencies: ["movement_base"],
        build: () => `print("Combat System")`
    },

    ui_base: {
        id: "ui_base",
        name: "UI Base",
        category: "UI",
        dependencies: [],
        build: () => `print("UI Loaded")`
    },

    jump_boost: {
        id: "jump_boost",
        name: "Jump Boost",
        category: "Movement",
        dependencies: ["movement_base"],
        build: () => `print("Jump Boost")`
    },

    health_system: {
        id: "health_system",
        name: "Health System",
        category: "System",
        dependencies: [],
        build: () => `print("Health System")`
    },

    input_base: {
        id: "input_base",
        name: "Input Base",
        category: "System",
        dependencies: [],
        build: () => `print("Input Base")`
    },

    damage_popup: {
        id: "damage_popup",
        name: "Damage Popup",
        category: "UI",
        dependencies: [],
        build: () => `print("Damage Popup")`
    }
};

module.exports = { templates };
