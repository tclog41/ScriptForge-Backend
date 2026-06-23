const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// ENV
// =========================

const API_KEY = process.env.API_KEY;

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
// USER
// =========================

function getUser(id) {
    if (!users[id]) {
        users[id] = {
            expiresAt: 0,
            genre: "",
            history: [],
            systems: [],
            scripts: {} // v1.6 NEW
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
// BLUEPRINTS
// =========================

const blueprints = {
    sprint: {
        location: "StarterPlayerScripts",
        code: `print("Sprint System Loaded")`
    },
    stamina: {
        location: "StarterGui",
        code: `print("Stamina System Loaded")`
    },
    ui: {
        location: "StarterGui",
        code: `print("UI System Loaded")`
    },
    door: {
        location: "Workspace",
        code: `print("Door System Loaded")`
    },
    inventory: {
        location: "StarterGui",
        code: `print("Inventory System Loaded")`
    }
};

// =========================
// DEPENDENCIES (from v1.5 still included)
// =========================

const dependencies = {
    sprint: ["stamina"],
    inventory: ["ui"],
    stamina: [],
    ui: [],
    door: []
};

// =========================
// RESOLVER
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
// INSTALL (v1.6 UPDATED)
// =========================

app.post("/install", auth, (req, res) => {
    const { deviceId, blueprint } = req.body;

    const user = getUser(deviceId);

    const order = resolveBlueprint(blueprint);

    let installed = [];

    for (const bp of order) {
        const data = blueprints[bp];

        if (!data) continue;

        user.systems.push(bp);

        user.scripts[bp] = data.code; // IMPORTANT v1.6

        installed.push({
            name: bp,
            location: data.location,
            code: data.code
        });
    }

    saveUsers();

    res.json({
        success: true,
        installed
    });
});

// =========================
// LIST BLUEPRINTS
// =========================

app.get("/blueprints", (req, res) => {
    res.json(Object.keys(blueprints));
});

// =========================
// EDIT ENGINE (v1.6 CORE)
// =========================

function editScript(original, request) {
    let updated = original;

    const r = request.toLowerCase();

    if (r.includes("faster")) {
        updated += "\n-- SPEED INCREASED";
    }

    if (r.includes("ui")) {
        updated += "\n-- UI LINKED";
    }

    if (r.includes("mobile")) {
        updated += "\n-- MOBILE SUPPORT ADDED";
    }

    if (r.includes("fix")) {
        updated += "\n-- BUG FIX APPLIED";
    }

    if (r.includes("smooth")) {
        updated += "\n-- SMOOTHNESS IMPROVED";
    }

    return updated;
}

// =========================
// EDIT ENDPOINT (v1.6)
// =========================

app.post("/edit", auth, (req, res) => {
    const { deviceId, blueprint, request } = req.body;

    const user = getUser(deviceId);

    if (!user.scripts[blueprint]) {
        return res.json({
            success: false,
            error: "Script not found"
        });
    }

    const original = user.scripts[blueprint];

    const updated = editScript(original, request);

    user.scripts[blueprint] = updated;

    saveUsers();

    res.json({
        success: true,
        updated
    });
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
// START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.6 running on", PORT);
});
