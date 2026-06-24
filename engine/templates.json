const templates = {

    movement_base: {
        id: "movement_base",
        name: "Movement Base",
        category: "Movement",
        dependencies: [],

        build: () => `
local Players = game:GetService("Players")
print("Movement Base Loaded")
`
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

local normal = 16
local sprint = 24

UIS.InputBegan:Connect(function(i,g)
	if g then return end
	if i.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = sprint
	end
end)

UIS.InputEnded:Connect(function(i)
	if i.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = normal
	end
end)
`
    },

    crouch_system: {
        id: "crouch_system",
        name: "Crouch System",
        category: "Movement",
        dependencies: ["movement_base"],

        build: () => `
local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

local crouched = false

UIS.InputBegan:Connect(function(i,g)
	if g then return end
	if i.KeyCode == Enum.KeyCode.C then
		crouched = not crouched
		print("Crouch:", crouched)
	end
end)
`
    }
};

module.exports = { templates };
