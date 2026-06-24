const templates = {

    ui_basic: {
        tags: ["ui"],
        files: [
            {
                name: "BasicUI",
                type: "LocalScript",
                parent: "StarterGui",
                folder: "UI",
                source: `
local player = game.Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "BasicUI"
gui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0,300,0,200)
frame.Position = UDim2.new(0.5,-150,0.5,-100)
frame.BackgroundColor3 = Color3.fromRGB(40,40,40)
frame.Parent = gui
`
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
                source: `
local player = game.Players.LocalPlayer
local char = player.Character or player.CharacterAdded:Wait()
local humanoid = char:WaitForChild("Humanoid")

local gui = Instance.new("ScreenGui")
gui.Name = "HUD"
gui.Parent = player.PlayerGui

local bar = Instance.new("Frame")
bar.Size = UDim2.new(0.2,0,0,20)
bar.Position = UDim2.new(0,20,0,20)
bar.BackgroundColor3 = Color3.fromRGB(0,255,0)
bar.Parent = gui

humanoid.HealthChanged:Connect(function(h)
    bar.Size = UDim2.new((h/100)*0.2,0,0,20)
end)
`
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
                source: `
local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer
local char = player.Character or player.CharacterAdded:Wait()
local humanoid = char:WaitForChild("Humanoid")

UIS.InputBegan:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        humanoid.WalkSpeed = 24
    end
end)

UIS.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        humanoid.WalkSpeed = 16
    end
end)
`
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
                source: `
print("Combat system loaded")
`
            }
        ]
    }
};

module.exports = { templates };