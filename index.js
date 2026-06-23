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
// USER SYSTEM
// =========================

function getUser(deviceId) {
    if (!users[deviceId]) {
        users[deviceId] = {
            expiresAt: 0,
            systems: [],
            genre: ""
        };
    }
    return users[deviceId];
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
// DEPENDENCIES (v1.5 CORE)
// =========================

const dependencies = {
    sprint: ["stamina"],
    inventory: ["ui"],
    stamina: [],
    ui: [],
    door: []
};

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
// DEPENDENCY RESOLVER
// =========================

function resolveBlueprint(name, installed = new Set()) {
    if (!blueprints[name]) return [];

    let result = [];

    const deps = dependencies[name] || [];

    for (const dep of deps) {
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
// LIST BLUEPRINTS
// =========================

app.get("/blueprints", (req, res) => {
    res.json(Object.keys(blueprints));
});

// =========================
// SMART INSTALL SYSTEM (v1.5)
// =========================

app.post("/install", auth, (req, res) => {
    const { deviceId, blueprint } = req.body;

    const user = getUser(deviceId);

    const order = resolveBlueprint(blueprint);

    let installed = [];

    for (const bp of order) {
        const data = blueprints[bp];

        installed.push({
            name: bp,
            location: data.location,
            code: data.code
        });

        if (!user.systems.includes(bp)) {
            user.systems.push(bp);
        }
    }

    saveUsers();

    res.json({
        success: true,
        installed
    });
});

// =========================
// GENRE
// =========================

app.post("/genre", auth, (req, res) => {
    const user = getUser(req.body.deviceId);

    user.genre = req.body.genre;

    saveUsers();

    const rec = {
        Horror: ["sprint", "stamina", "door"],
        FPS: ["sprint", "door"],
        Simulator: ["inventory"]
    };

    res.json({
        genre: user.genre,
        recommendations: rec[user.genre] || []
    });
});

// =========================
// START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.5 running on", PORT);
});
