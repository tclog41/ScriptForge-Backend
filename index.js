const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// ENV
// =========================

const API_KEY = process.env.API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// =========================
// STORAGE
// =========================

let users = {};
let inviteCodes = {};

if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

if (fs.existsSync("./invitecodes.json")) {
    inviteCodes = JSON.parse(fs.readFileSync("./invitecodes.json"));
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

function saveCodes() {
    fs.writeFileSync("./invitecodes.json", JSON.stringify(inviteCodes, null, 2));
}

// =========================
// USER SYSTEM
// =========================

function getUser(id) {
    if (!users[id]) {
        users[id] = {
            expiresAt: 0,
            genre: "",
            history: []
        };
    }
    return users[id];
}

function expired(user) {
    return Date.now() > user.expiresAt;
}

// =========================
// AUTH
// =========================

function auth(req, res, next) {
    if (req.body.key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// REDEEM
// =========================

app.post("/redeem", auth, (req, res) => {
    const { deviceId, code } = req.body;

    if (!inviteCodes[code]) {
        return res.json({ success: false, error: "Invalid code" });
    }

    if (inviteCodes[code] === true) {
        return res.json({ success: false, error: "Used code" });
    }

    const user = getUser(deviceId);
    user.expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    inviteCodes[code] = true;

    saveUsers();
    saveCodes();

    res.json({ success: true });
});

// =========================
// ACCESS
// =========================

app.post("/access", auth, (req, res) => {
    const user = getUser(req.body.deviceId);

    if (expired(user)) {
        return res.json({ success: false });
    }

    res.json({ success: true });
});

// =========================
// BLUEPRINT DATA
// =========================

const blueprints = {
    sprint: {
        location: "StarterPlayerScripts",
        code: `local UIS = game:GetService("UserInputService")
local player = game.Players.LocalPlayer
local char = player.Character or player.CharacterAdded:Wait()
local hum = char:WaitForChild("Humanoid")

UIS.InputBegan:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		hum.WalkSpeed = 24
	end
end)

UIS.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		hum.WalkSpeed = 16
	end
end)`
    },

    stamina: {
        location: "StarterGui",
        code: `local stamina = 100
while true do
	wait(1)
	stamina = math.max(0, stamina - 1)
	print("Stamina:", stamina)
end`
    },

    door: {
        location: "Workspace",
        code: `script.Parent.Touched:Connect(function()
	print("Door triggered")
end)`
    }
};

// =========================
// LIST BLUEPRINTS
// =========================

app.get("/blueprints", (req, res) => {
    res.json(Object.keys(blueprints));
});

// =========================
// GET SINGLE BLUEPRINT
// =========================

app.get("/blueprint/:name", (req, res) => {
    const bp = blueprints[req.params.name];

    if (!bp) {
        return res.json({ error: "Not found" });
    }

    res.json(bp);
});

// =========================
// GENRE SYSTEM
// =========================

app.post("/genre", auth, (req, res) => {
    const user = getUser(req.body.deviceId);

    user.genre = req.body.genre;

    saveUsers();

    const rec = {
        Horror: ["sprint", "stamina", "door"],
        FPS: ["sprint", "door"],
        Simulator: ["stamina"]
    };

    res.json({
        genre: user.genre,
        recommendations: rec[user.genre] || []
    });
});

// =========================
// AI (DEEPSEEK PROXY)
// =========================

app.post("/ai", auth, async (req, res) => {
    const user = getUser(req.body.deviceId);

    if (expired(user)) {
        return res.json({ success: false, error: "Expired" });
    }

    user.history.push(req.body.prompt);
    if (user.history.length > 10) user.history.shift();

    try {
        const response = await fetch(DEEPSEEK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are ScriptForge AI for Roblox Studio. Output ONLY Lua scripts."
                    },
                    {
                        role: "user",
                        content: req.body.prompt + "\nGenre:" + user.genre
                    }
                ]
            })
        });

        const data = await response.json();

        res.json({
            success: true,
            output: data.choices?.[0]?.message?.content || "No response"
        });

    } catch (e) {
        res.json({ success: false, error: "AI failed" });
    }
});

// =========================
// START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.4 running on", PORT);
});
