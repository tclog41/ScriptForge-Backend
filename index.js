const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// CONFIG
// =========================

const API_KEY = process.env.API_KEY;

const AI_KEY = process.env.AI_KEY;
const AI_URL = "https://api.deepseek.com/chat/completions";

// =========================
// STORAGE
// =========================

let users = {};
let inviteCodes = {};
let cache = {};

// load users
if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

// load invite codes
if (fs.existsSync("./invitecodes.json")) {
    inviteCodes = JSON.parse(fs.readFileSync("./invitecodes.json"));
}

// =========================
// SAVE
// =========================

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
            systems: [],
            scripts: {},
            genre: ""
        };
    }
    return users[id];
}

function expired(user) {
    return Date.now() > user.expiresAt;
}

// =========================
// CACHE (KEY COST SAVER)
// =========================

function getCache(key) {
    const item = cache[key];
    if (!item) return null;

    if (Date.now() > item.expiry) {
        delete cache[key];
        return null;
    }

    return item.value;
}

function setCache(key, value) {
    cache[key] = {
        value,
        expiry: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };
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
// BLUEPRINTS
// =========================

const blueprints = {
    sprint: { location: "StarterPlayerScripts", code: `print("Sprint Loaded")` },
    stamina: { location: "StarterGui", code: `print("Stamina Loaded")` },
    ui: { location: "StarterGui", code: `print("UI Loaded")` },
    door: { location: "Workspace", code: `print("Door Loaded")` },
    inventory: { location: "StarterGui", code: `print("Inventory Loaded")` }
};

// =========================
// DEPENDENCIES
// =========================

const dependencies = {
    sprint: ["stamina"],
    inventory: ["ui"],
    stamina: [],
    ui: [],
    door: []
};

// =========================
// RESOLVE DEPENDENCIES
// =========================

function resolveBlueprint(name, installed = new Set()) {
    if (!blueprints[name]) return [];

    let result = [];

    for (const dep of (dependencies[name] || [])) {
        if (!installed.has(dep)) {
            result = result.concat(resolveBlueprint(dep, installed));
            installed.add(dep);
        }
    }

    result.push(name);
    installed.add(name);

    return result;
}

// =========================
// INSTALL
// =========================

app.post("/install", auth, (req, res) => {
    const { deviceId, blueprint } = req.body;

    const cacheKey = `install-${deviceId}-${blueprint}`;
    const cached = getCache(cacheKey);

    if (cached) {
        return res.json({
            success: true,
            source: "cache",
            installed: cached
        });
    }

    const user = getUser(deviceId);
    const order = resolveBlueprint(blueprint);

    let installed = [];

    for (const bp of order) {
        const data = blueprints[bp];
        if (!data) continue;

        user.systems.push(bp);
        user.scripts[bp] = data.code;

        installed.push({
            name: bp,
            location: data.location,
            code: data.code
        });
    }

    setCache(cacheKey, installed);
    saveUsers();

    res.json({
        success: true,
        source: "blueprint",
        installed
    });
});

// =========================
// EDIT ENGINE (RULE BASED)
// =========================

function ruleEdit(script, request) {
    const r = request.toLowerCase();

    let out = script;

    if (r.includes("faster")) out += "\n-- SPEED BOOST";
    if (r.includes("slower")) out += "\n-- SPEED REDUCED";
    if (r.includes("ui")) out += "\n-- UI LINKED";
    if (r.includes("mobile")) out += "\n-- MOBILE SUPPORT";
    if (r.includes("fix")) out += "\n-- BUG FIX";
    if (r.includes("smooth")) out += "\n-- SMOOTH IMPROVED";

    return out;
}

// =========================
// AI CALL (ONLY LAST RESORT)
// =========================

async function callAI(prompt) {
    const res = await fetch(AI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AI_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "You are a Roblox Luau developer. Return ONLY full script."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2
        })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "-- AI FAILED";
}

// =========================
// HYBRID EDIT ENGINE
// =========================

async function smartEdit(deviceId, blueprint, request, baseScript) {

    const cacheKey = `edit-${blueprint}-${request}`;
    const cached = getCache(cacheKey);

    if (cached) return cached;

    // 1. RULE ENGINE FIRST (FREE)
    const keywords = ["faster", "slower", "ui", "mobile", "fix", "smooth"];

    if (keywords.some(k => request.toLowerCase().includes(k))) {
        const result = ruleEdit(baseScript, request);
        setCache(cacheKey, result);
        return result;
    }

    // 2. AI FALLBACK (EXPENSIVE)
    const prompt = `
Modify this Roblox script:

SCRIPT:
${baseScript}

REQUEST:
${request}

Return ONLY full script.
    `;

    const ai = await callAI(prompt);

    setCache(cacheKey, ai);
    return ai;
}

// =========================
// EDIT ENDPOINT
// =========================

app.post("/edit", auth, async (req, res) => {
    const { deviceId, blueprint, request } = req.body;

    const user = getUser(deviceId);

    if (!user.scripts[blueprint]) {
        return res.json({
            success: false,
            error: "Script not found"
        });
    }

    const updated = await smartEdit(
        deviceId,
        blueprint,
        request,
        user.scripts[blueprint]
    );

    user.scripts[blueprint] = updated;

    saveUsers();

    res.json({
        success: true,
        source: updated.includes("-- AI") ? "ai" : "rule-or-cache",
        updated
    });
});

// =========================
// ACCESS CHECK
// =========================

app.post("/access", auth, (req, res) => {
    const user = getUser(req.body.deviceId);

    if (expired(user)) {
        return res.json({ success: false });
    }

    res.json({ success: true });
});

// =========================
// START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.7 Hybrid AI running on", PORT);
});
