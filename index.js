const express = require("express");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// 🌐 BASIC SERVER
// =========================

app.get("/", (req, res) => {
    res.send("ScriptForge v1 Backend Running 🚀");
});

// =========================
// 🔐 AUTH
// =========================

const API_KEY = process.env.API_KEY;

// =========================
// 💾 USER DATA
// =========================

let users = {};

if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

// =========================
// 🧠 PROJECT MEMORY (v1 CORE FEATURE)
// =========================

function getProject(userId) {
    if (!users[userId]) {
        users[userId] = {
            expiresAt: Date.now() + 12 * 60 * 60 * 1000,
            systems: [],
            modifiers: [],
            history: []
        };
    }
    return users[userId];
}

// =========================
// 🔐 AUTH MIDDLEWARE
// =========================

function auth(req, res, next) {
    if (req.body.key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 🧩 BLUEPRINT ENGINE (v1)
// =========================

const blueprints = {
    sprint: {
        base: "-- Sprint System\nprint('Sprint loaded')",
        allowedModifiers: ["ui", "stamina", "mobile"]
    },
    door: {
        base: "-- Door System\nprint('Door loaded')",
        allowedModifiers: ["lock", "key"]
    },
    ui: {
        base: "-- UI System\nprint('UI loaded')",
        allowedModifiers: []
    }
};

// =========================
// ⚙️ APPLY MODIFIERS
// =========================

function applyModifiers(script, modifiers) {
    let output = script;

    if (modifiers.includes("ui")) {
        output += "\n-- UI attached";
    }

    if (modifiers.includes("stamina")) {
        output += "\n-- Stamina system attached";
    }

    if (modifiers.includes("mobile")) {
        output += "\n-- Mobile support enabled";
    }

    return output;
}

// =========================
// 🚀 GENERATE ENGINE (CORE)
// =========================

app.post("/generate", auth, (req, res) => {
    const { userId, system, modifiers = [] } = req.body;

    const project = getProject(userId);

    // save history
    project.history.push({ system, modifiers });
    if (project.history.length > 20) project.history.shift();

    const blueprint = blueprints[system];

    if (!blueprint) {
        return res.json({
            success: false,
            error: "No blueprint found (AI fallback reserved)"
        });
    }

    // filter invalid modifiers
    const validMods = modifiers.filter(m =>
        blueprint.allowedModifiers.includes(m)
    );

    let script = blueprint.base;

    script = applyModifiers(script, validMods);

    // update project state
    project.systems.push(system);
    project.modifiers = [...new Set([...project.modifiers, ...validMods])];

    saveUsers();

    return res.json({
        success: true,
        system,
        modifiers: validMods,
        script,
        projectState: project
    });
});

// =========================
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1 backend running on", PORT);
});
