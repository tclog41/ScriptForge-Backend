const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");

const app = express();
app.use(express.json());

// =========================
// 🌐 RENDER WEB SERVER FIX
// =========================

app.get("/", (req, res) => {
    res.send("ScriptForge Backend Running 🤖");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});

// =========================
// 🔐 SECURITY KEY (IMPORTANT)
// =========================

const API_KEY = process.env.API_KEY;

// =========================
// 🚦 RATE LIMITING
// =========================

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many requests"
});

app.use("/generate", limiter);

// =========================
// 💾 PERSISTENT USER SYSTEM
// =========================

const MAX_USERS = 25;

let activeUsers = new Set();

// load users from file
if (fs.existsSync("./users.json")) {
    try {
        const data = JSON.parse(fs.readFileSync("./users.json"));
        activeUsers = new Set(data);
    } catch (e) {
        console.log("Failed to load users.json");
    }
}

// save users to file
function saveUsers() {
    fs.writeFileSync(
        "./users.json",
        JSON.stringify([...activeUsers])
    );
}

function addUser(userId) {
    if (activeUsers.size >= MAX_USERS) return false;

    activeUsers.add(userId);
    saveUsers();
    return true;
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

function useInviteCode(code, userId) {
    if (!inviteCodes[code]) return false;
    if (inviteCodes[code] === true) return false;

    inviteCodes[code] = true;
    return addUser(userId);
}

// =========================
// 🧠 TEMPLATE SYSTEM
// =========================

function getTemplate(message) {
    message = message.toLowerCase();

    if (message.includes("sprint")) return "sprint";
    if (message.includes("door")) return "door";
    if (message.includes("ui")) return "ui";
    if (message.includes("inventory")) return "inventory";
    if (message.includes("damage")) return "damage";
    if (message.includes("health")) return "health_ui";

    return null;
}

const TEMPLATES = {
    sprint: "-- Sprint system script",
    door: "-- Door system script",
    ui: "-- UI system script",
    inventory: "-- Inventory system script",
    damage: "-- Damage system script",
    health_ui: "-- Health UI script"
};

// =========================
// 🧠 MEMORY SYSTEM (LIMITED)
// =========================

const memory = {};

function saveMessage(userId, role, message) {
    if (!memory[userId]) memory[userId] = [];

    memory[userId].push({ role, message });

    // keep last 5 messages only (cost control)
    if (memory[userId].length > 5) {
        memory[userId].shift();
    }
}

// =========================
// 🤖 AI CONTROL (COST SAFE)
// =========================

const aiUsage = {};
const AI_LIMIT = 3;

function canUseAI(userId) {
    if (!aiUsage[userId]) aiUsage[userId] = 0;

    if (aiUsage[userId] >= AI_LIMIT) return false;

    aiUsage[userId]++;
    return true;
}

async function callAI(message, memoryData) {
    return `-- AI GENERATED SCRIPT\n-- Input: ${message}`;
}

// =========================
// 🔐 OPTIONAL API KEY CHECK
// =========================

function checkKey(req, res, next) {
    const key = req.body.key || req.headers["x-api-key"];

    if (!key || key !== API_KEY) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized"
        });
    }

    next();
}

// =========================
// 🚀 MAIN GENERATE ROUTE
// =========================

app.post("/generate", checkKey, async (req, res) => {
    const { message, userId } = req.body;

    if (!message || !userId) {
        return res.json({
            success: false,
            error: "Missing data"
        });
    }

    saveMessage(userId, "user", message);

    // =========================
    // 🟢 TEMPLATE FIRST (FREE)
    // =========================

    const template = getTemplate(message);

    if (template && TEMPLATES[template]) {
        return res.json({
            success: true,
            source: "template",
            script: TEMPLATES[template]
        });
    }

    // =========================
    // 🔴 ACCESS CHECK
    // =========================

    if (!activeUsers.has(userId)) {
        return res.json({
            success: false,
            error: "Not in Alpha"
        });
    }

    // =========================
    // 🤖 AI FALLBACK (LIMITED)
    // =========================

    if (!canUseAI(userId)) {
        return res.json({
            success: false,
            error: "AI limit reached"
        });
    }

    const aiResult = await callAI(message, memory[userId] || []);

    saveMessage(userId, "assistant", aiResult);

    return res.json({
        success: true,
        source: "ai",
        script: aiResult
    });
});

// =========================
// 🤖 DISCORD STYLE COMMAND HELPERS (OPTIONAL LOGIC ONLY)
// =========================

app.post("/redeem", checkKey, (req, res) => {
    const { code, userId } = req.body;

    if (!code || !userId) {
        return res.json({ success: false, error: "Missing data" });
    }

    const success = useInviteCode(code, userId);

    if (success) {
        return res.json({
            success: true,
            message: "Added to Alpha"
        });
    }

    return res.json({
        success: false,
        error: "Invalid code"
    });
});
