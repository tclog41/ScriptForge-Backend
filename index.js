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
    res.send("ScriptForge Backend Running 🚀");
});

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});

// =========================
// 🔐 CONFIG
// =========================

const API_KEY = process.env.API_KEY;

// 👇 PUT YOUR USER ID HERE (ADMIN FOREVER ACCESS)
const ADMIN_ID = "YOUR_DISCORD_OR_ROBLOX_USER_ID";

// =========================
// 💾 MEMORY STORE
// =========================

let users = {};

// load saved users
if (fs.existsSync("./users.json")) {
    try {
        users = JSON.parse(fs.readFileSync("./users.json"));
    } catch (e) {
        console.log("Failed to load users.json");
    }
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

// =========================
// 🎟️ INVITE CODES
// =========================

const inviteCodes = {
    "ALPHA-1": false,
    "ALPHA-2": false,
    "ALPHA-3": false,
    "ALPHA-4": false,
    "ALPHA-5": false
};

function redeemCode(code, userId) {
    if (!inviteCodes[code]) return false;
    if (inviteCodes[code] === true) return false;

    inviteCodes[code] = true;

    users[userId] = {
        role: "user",
        expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
        aiUses: 0
    };

    saveUsers();
    return true;
}

// =========================
// 🔐 ACCESS CHECK
// =========================

function hasAccess(userId) {
    if (userId === ADMIN_ID) return true;

    const user = users[userId];
    if (!user) return false;

    return Date.now() < user.expiresAt;
}

// =========================
// 🤖 AI USAGE LIMIT (10 USES)
// =========================

function canUseAI(userId) {
    if (userId === ADMIN_ID) return true;

    const user = users[userId];
    if (!user) return false;

    if (user.aiUses >= 10) return false;

    user.aiUses++;
    saveUsers();
    return true;
}

// =========================
// 🚦 RATE LIMIT (anti spam)
// =========================

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 10
}));

// =========================
// 🔐 MIDDLEWARE
// =========================

function auth(req, res, next) {
    const key = req.body.key;

    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}

// =========================
// 🎟️ REDEEM ROUTE
// =========================

app.post("/redeem", auth, (req, res) => {
    const { code, userId } = req.body;

    if (!code || !userId) {
        return res.json({ error: "Missing data" });
    }

    const ok = redeemCode(code, userId);

    if (!ok) {
        return res.json({ error: "Invalid code" });
    }

    res.json({ success: true, message: "Access granted" });
});

// =========================
// 🤖 GENERATE ROUTE
// =========================

app.post("/generate", auth, async (req, res) => {
    const { message, userId } = req.body;

    if (!message || !userId) {
        return res.json({ error: "Missing data" });
    }

    // -------------------------
    // 🔐 ACCESS CHECK
    // -------------------------

    if (!hasAccess(userId)) {
        return res.json({
            success: false,
            error: "You are not in ScriptForge Alpha."
        });
    }

    // -------------------------
    // 🤖 AI LIMIT CHECK
    // -------------------------

    if (!canUseAI(userId)) {
        return res.json({
            success: false,
            error: "AI limit reached (10 uses)."
        });
    }

    // -------------------------
    // 🧠 TEMPLATE SYSTEM (FAST + FREE)
    // -------------------------

    const lower = message.toLowerCase();

    let script = null;

    if (lower.includes("sprint")) {
        script = "-- Sprint system\nlocal speed = 32";
    }
    else if (lower.includes("door")) {
        script = "-- Door system\nprint('Door ready')";
    }
    else if (lower.includes("ui")) {
        script = "-- UI system\nprint('UI created')";
    }

    // -------------------------
    // 🤖 AI FALLBACK
    // -------------------------

    if (!script) {
        script = `-- AI GENERATED LUA SCRIPT\n-- ${message}`;
    }

    return res.json({
        success: true,
        script
    });
});
