const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// 💾 STORAGE
// =========================

let users = {};
let cache = {};

// load users
if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

// =========================
// 🧠 PROJECT MEMORY
// =========================

function getProject(userId) {
    if (!users[userId]) {
        users[userId] = {
            expiresAt: Date.now() + 12 * 60 * 60 * 1000,
            systems: [],
            modifiers: [],
            scripts: {},
            history: []
        };
    }
    return users[userId];
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

// =========================
// 🔐 AUTH
// =========================

const API_KEY = process.env.API_KEY;

function auth(req, res, next) {
    if (req.body.key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 📁 BLUEPRINT FOLDERS (NEW)
// =========================

const blueprints = {
    movement: {
        sprint: {
            base: "-- Sprint System",
            modifiers: ["ui", "stamina", "mobile"]
        },
        crouch: {
            base: "-- Crouch System",
            modifiers: ["ui"]
        }
    },

    ui: {
        healthbar: {
            base: "-- Health UI",
            modifiers: []
        },
        inventory: {
            base: "-- Inventory UI",
            modifiers: ["drag", "mobile"]
        }
    },

    world: {
        door: {
            base: "-- Door System",
            modifiers: ["lock", "key"]
        }
    }
};

// =========================
// ⚡ CACHE CHECK (FAST PATH)
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
        expiry: Date.now() + 1000 * 60 * 60 // 1 hour
    };
}

// =========================
// 🔧 MODIFIER ENGINE
// =========================

function applyModifiers(script, mods) {
    let out = script;

    if (mods.includes("ui")) out += "\n-- UI attached";
    if (mods.includes("stamina")) out += "\n-- stamina system";
    if (mods.includes("mobile")) out += "\n-- mobile support";
    if (mods.includes("lock")) out += "\n-- lock system";

    return out;
}

// =========================
// 🧠 FIND BLUEPRINT (NEW STRUCTURE)
// =========================

function findBlueprint(system) {
    for (const folder in blueprints) {
        if (blueprints[folder][system]) {
            return {
                folder,
                name: system,
                data: blueprints[folder][system]
            };
        }
    }
    return null;
}

// =========================
// ✏️ EDIT ENGINE (NEW)
// =========================

function editExisting(project, system, request) {
    let existing = project.scripts[system];

    if (!existing) return null;

    if (request.includes("faster")) {
        existing += "\n-- speed increased";
    }

    if (request.includes("ui")) {
        existing += "\n-- ui updated";
    }

    return existing;
}

// =========================
// 🚀 GENERATE (MAIN ENGINE)
// =========================

app.post("/generate", auth, (req, res) => {
    const { userId, system, modifiers = [], mode = "create", request = "" } = req.body;

    const project = getProject(userId);

    const cacheKey = `${userId}-${system}-${modifiers.join("-")}-${mode}`;

    // =========================
    // ⚡ CACHE HIT
    // =========================

    const cached = getCache(cacheKey);
    if (cached) {
        return res.json({
            success: true,
            source: "cache",
            script: cached
        });
    }

    // =========================
    // ✏️ EDIT MODE
    // =========================

    if (mode === "edit") {
        const edited = editExisting(project, system, request);

        if (edited) {
            setCache(cacheKey, edited);
            project.scripts[system] = edited;
            saveUsers();

            return res.json({
                success: true,
                source: "edit-engine",
                script: edited
            });
        }
    }

    // =========================
    // 🧩 BLUEPRINT LOOKUP
    // =========================

    const blueprint = findBlueprint(system);

    if (!blueprint) {
        return res.json({
            success: false,
            error: "No blueprint found (AI fallback reserved)"
        });
    }

    let script = blueprint.data.base;

    // apply modifiers
    script = applyModifiers(script, modifiers);

    // save into project memory
    project.systems.push(system);
    project.modifiers.push(...modifiers);
    project.scripts[system] = script;

    saveUsers();

    // store cache
    setCache(cacheKey, script);

    return res.json({
        success: true,
        source: "blueprint",
        script
    });
});

// =========================
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log("ScriptForge v1.1 running on", PORT);
});
