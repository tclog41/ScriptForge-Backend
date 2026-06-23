const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

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
            genre: "",
            systems: [],
            scripts: {},
            history: []
        };
    }
    return users[id];
}

function expired(user) {
    return Date.now() > user.expiresAt;
}

// =========================
// CACHE SYSTEM (IMPORTANT COST SAVER)
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
        expiry: Date.now() + 1000 * 60 * 60 * 24 // 24h
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
    sprint: {
        location: "StarterPlayerScripts",
        code: `print("Sprint Loaded")`
    },
    stamina: {
        location: "StarterGui",
        code: `print("Stamina Loaded")`
    },
    ui: {
        location: "StarterGui",
        code: `print("UI Loaded")`
    },
    door: {
        location: "Workspace",
        code: `print("Door Loaded")`
    },
    inventory: {
        location: "StarterGui",
        code: `print("Inventory Loaded")`
    }
};

// =========================
// DEPENDENCIES (NO AI COST)
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
// BLUEPRINT LIST
// =========================

app.get("/blueprints", (req, res) => {
    res.json(Object.keys(blueprints));
});

// =========================
// INSTALL (CACHE-FIRST)
// =========================

app.post("/install", auth, (req, res) => {
    const { deviceId, blueprint } = req.body;

    const cacheKey = `${deviceId}-${blueprint}`;

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
// EDIT ENGINE (NO AI COST)
// =========================

function editScript(original, request) {
    const r = request.toLowerCase();

    let out = original;

    if (r.includes("faster")) out += "\n-- speed increased";
    if (r.includes("slower")) out += "\n-- speed reduced";
    if (r.includes("ui")) out += "\n-- ui linked";
    if (r.includes("mobile")) out += "\n-- mobile support added";
    if (r.includes("fix")) out += "\n-- bug fix applied";
    if (r.includes("smooth")) out += "\n-- smoothing added";

    return out;
}

// =========================
// EDIT ENDPOINT
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

    const updated = editScript(user.scripts[blueprint], request);

    user.scripts[blueprint] = updated;

    saveUsers();

    res.json({
        success: true,
        updated
    });
});

// =========================
// START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.6.1 running on", PORT);
});
