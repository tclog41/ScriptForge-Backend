const express = require("express");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

// =========================
// 🌐 SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("ScriptForge Web Service Running 🚀");
});

// =========================
// 💾 USERS STORAGE
// =========================

let users = {};

if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

// =========================
// 🔐 AUTH (Discord bot key)
// =========================

const API_KEY = process.env.API_KEY;

function auth(req, res, next) {
    if (req.body.key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// ⏳ ACCESS CHECK
// =========================

function hasAccess(userId) {
    const user = users[userId];
    if (!user) return false;
    return Date.now() < user.expiresAt;
}

// =========================
// 🧠 BLUEPRINT SYSTEM (CORE)
// =========================

const blueprints = {
    sprint: {
        script: "-- Sprint System\nprint('Sprint loaded')",
        modifiers: ["ui", "stamina"]
    },
    door: {
        script: "-- Door System\nprint('Door loaded')",
        modifiers: ["lock", "key"]
    },
    ui: {
        script: "-- UI System\nprint('UI loaded')",
        modifiers: []
    }
};

// =========================
// 🔧 GENERATE ENGINE
// =========================

app.post("/generate", auth, (req, res) => {
    const { userId, system, modifiers = [] } = req.body;

    if (!hasAccess(userId)) {
        return res.json({ error: "No access" });
    }

    const blueprint = blueprints[system];

    if (!blueprint) {
        return res.json({
            error: "No blueprint found (AI fallback later)"
        });
    }

    let script = blueprint.script;

    // =========================
    // 🧩 APPLY MODIFIERS (NO AI)
    // =========================

    if (modifiers.includes("ui")) {
        script += "\n-- UI module attached";
    }

    if (modifiers.includes("stamina")) {
        script += "\n-- Stamina system attached";
    }

    return res.json({
        success: true,
        script,
        system,
        modifiers
    });
});

// =========================
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge backend running on port", PORT);
});
