const templates = {

    // =========================
    // 1. MOVEMENT BASE
    // =========================
    movement_base: {
        id: "movement_base",
        name: "Movement Base",
        category: "Movement",
        dependencies: [],

        build: () => `
local Players = game:GetService("Players")
local player = Players.LocalPlayer

local function getHumanoid()
	return (player.Character or player.CharacterAdded:Wait()):WaitForChild("Humanoid")
end

print("Movement Base Loaded")
`
    },

    // =========================
    // 2. SPRINT SYSTEM
    // =========================
    sprint_system: {
        id: "sprint_system",
        name: "Sprint System",
        category: "Movement",
        dependencies: ["movement_base"],

        build: () => `
local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

local sprintSpeed = 24
local normalSpeed = 16

local function hum()
	return (player.Character or player.CharacterAdded:Wait()):WaitForChild("Humanoid")
end

UIS.InputBegan:Connect(function(input, gpe)
	if gpe then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = sprintSpeed
	end
end)

UIS.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		hum().WalkSpeed = normalSpeed
	end
end)
`
    },

    // =========================
    // 3. CROUCH SYSTEM
    // =========================
    crouch_system: {
        id: "crouch_system",
        name: "Crouch System",
        category: "Movement",
        dependencies: ["movement_base"],

        build: () => `
local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

local crouched = false

UIS.InputBegan:Connect(function(input, gpe)
	if gpe then return end
	if input.KeyCode == Enum.KeyCode.C then
		crouched = not crouched

		local hum = (player.Character or player.CharacterAdded:Wait()):WaitForChild("Humanoid")

		if crouched then
			hum.WalkSpeed = 8
		else
			hum.WalkSpeed = 16
		end
	end
end)
`
    },

    // =========================
    // 4. HEALTH SYSTEM
    // =========================
    health_system: {
        id: "health_system",
        name: "Health System",
        category: "System",
        dependencies: [],

        build: () => `
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid")

		hum.HealthChanged:Connect(function()
			print("Health:", hum.Health)
		end)
	end)
end)
`
    },

    // =========================
    // 5. UI SYSTEM
    // =========================
    ui_base: {
        id: "ui_base",
        name: "UI System",
        category: "UI",
        dependencies: [],

        build: () => `
local player = game.Players.LocalPlayer

local gui = Instance.new("ScreenGui")
gui.Name = "GameUI"
gui.Parent = player:WaitForChild("PlayerGui")

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0,200,0,50)
label.Position = UDim2.new(0,10,0,10)
label.Text = "Game Loaded"
label.Parent = gui
`
    },

    // =========================
    // 6. BASIC COMBAT
    // =========================
    combat_system: {
        id: "combat_system",
        name: "Combat System",
        category: "Combat",
        dependencies: ["movement_base"],

        build: () => `
local UIS = game:GetService("UserInputService")

local damage = 25

UIS.InputBegan:Connect(function(input, gpe)
	if gpe then return end

	if input.KeyCode == Enum.KeyCode.F then
		print("Attack! Damage:", damage)
	end
end)
`
    },

    // =========================
    // 7. STAMINA SYSTEM
    // =========================
    stamina_system: {
        id: "stamina_system",
        name: "Stamina System",
        category: "Movement",
        dependencies: ["movement_base"],

        build: () => `
local stamina = 100

while true do
	task.wait(1)

	stamina = math.max(0, stamina - 1)

	print("Stamina:", stamina)
end
`
    },

    // =========================
    // 8. JUMP BOOST SYSTEM
    // =========================
    jump_boost: {
        id: "jump_boost",
        name: "Jump Boost",
        category: "Movement",
        dependencies: ["movement_base"],

        build: () => `
local player = game.Players.LocalPlayer

local function apply()
	local hum = (player.Character or player.CharacterAdded:Wait()):WaitForChild("Humanoid")
	hum.JumpPower = 60
end

apply()
`
    },

    // =========================
    // 9. DAMAGE POPUP SYSTEM
    // =========================
    damage_popup: {
        id: "damage_popup",
        name: "Damage Popup",
        category: "UI",
        dependencies: [],

        build: () => `
print("Damage popup system placeholder")
`
    },

    // =========================
    // 10. INPUT CONTROLLER BASE
    // =========================
    input_base: {
        id: "input_base",
        name: "Input Base",
        category: "System",
        dependencies: [],

        build: () => `
local UIS = game:GetService("UserInputService")
print("Input system ready")
`
    }
};

module.exports = { templates };
