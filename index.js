const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// 🔐 ENV
// =========================

const API_KEY = process.env.API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// =========================
// 💾 STORAGE
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
// ⏳ ACCESS SYSTEM (12 HOURS)
// =========================

function getUser(deviceId) {
    if (!users[deviceId]) {
        users[deviceId] = {
            expiresAt: 0,
            systems: [],
            history: [],
            genre: ""
        };
    }
    return users[deviceId];
}

function isExpired(user) {
    return Date.now() > user.expiresAt;
}

// =========================
// 🔐 MIDDLEWARE
// =========================

function auth(req, res, next) {
    if (req.body.key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 🎟️ REDEEM CODE
// =========================

app.post("/redeem", auth, (req, res) => {
    const { deviceId, code } = req.body;

    if (!deviceId || !code) {
        return res.json({ success: false, error: "Missing data" });
    }

    if (!inviteCodes[code]) {
        return res.json({ success: false, error: "Invalid code" });
    }

    if (inviteCodes[code] === true) {
        return res.json({ success: false, error: "Code already used" });
    }

    const user = getUser(deviceId);

    user.expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    inviteCodes[code] = true;

    saveUsers();
    saveCodes();

    res.json({ success: true });
});

// =========================
// 🔓 ACCESS CHECK
// =========================

app.post("/access", auth, (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return res.json({ success: false });
    }

    const user = getUser(deviceId);

    if (isExpired(user)) {
        return res.json({ success: false });
    }

    res.json({ success: true, user });
});

// =========================
// 📦 BLUEPRINT LIST
// =========================

const blueprints = [
    "sprint",
    "stamina",
    "crouch",
    "door",
    "inventory",
    "healthbar",
    "ui",
    "leaderstats"
];

app.get("/blueprints", (req, res) => {
    res.json(blueprints);
});

// =========================
// 🎮 GENRE SYSTEM
// =========================

app.post("/genre", auth, (req, res) => {
    const { deviceId, genre } = req.body;

    const user = getUser(deviceId);
    user.genre = genre;

    saveUsers();

    const recommendations = {
        Horror: ["sprint", "stamina", "door", "ui"],
        Simulator: ["inventory", "leaderstats"],
        FPS: ["sprint", "ui", "healthbar"]
    };

    res.json({
        genre,
        recommendations: recommendations[genre] || []
    });
});

// =========================
// 🤖 AI (DEEPSEEK)
// =========================

app.post("/ai", auth, async (req, res) => {
    const { deviceId, prompt } = req.body;

    const user = getUser(deviceId);

    if (isExpired(user)) {
        return res.json({ success: false, error: "Expired" });
    }

    user.history.push(prompt);
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
                        content:
                            "You are ScriptForge AI for Roblox Studio. Output only clean Lua scripts when requested."
                    },
                    {
                        role: "user",
                        content: `
Genre: ${user.genre}
History: ${user.history.join("\n")}
Request: ${prompt}
                        `
                    }
                ],
                temperature: 0.4
            })
        });

        const data = await response.json();

        const output =
            data.choices?.[0]?.message?.content || "No response";

        res.json({
            success: true,
            output
        });

    } catch (err) {
        res.json({
            success: false,
            error: "AI request failed"
        });
    }
});

// =========================
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.2 running on port", PORT);
});
