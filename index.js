const express = require("express");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

/* =========================
   🔐 SECURITY KEY SYSTEM
========================= */

const API_KEY = process.env.API_KEY;

/* Middleware: blocks all unapproved requests */
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

/* =========================
   🚦 RATE LIMITING (COST PROTECTION)
========================= */

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // max requests per user per minute
    message: "Too many requests, slow down"
});

app.use("/generate", limiter);

/* =========================
   🧠 SIMPLE MEMORY SYSTEM
========================= */

const memory = {};

function saveMessage(userId, role, message) {
    if (!memory[userId]) {
        memory[userId] = [];
    }

    memory[userId].push({ role, message });

    // keep only last 5 messages (COST CONTROL)
    if (memory[userId].length > 5) {
        memory[userId].shift();
    }
}

/* =========================
   📁 TEMPLATE SYSTEM
========================= */

function getTemplate(message) {
    message = message.toLowerCase();

    if (message.includes("sprint")) return "sprint";
    if (message.includes("door")) return "door";
    if (message.includes("ui") || message.includes("hud")) return "ui";
    if (message.includes("inventory")) return "inventory";
    if (message.includes("damage")) return "damage";
    if (message.includes("health")) return "health_ui";

    return null;
}

/* Dummy templates (replace with your file system loader) */
const TEMPLATES = {
    sprint: "-- Sprint system code here",
    door: "-- Door system code here",
    ui: "-- UI system code here",
    inventory: "-- Inventory system code here",
    damage: "-- Damage system code here",
    health_ui: "-- Health UI system code here"
};

/* =========================
   🤖 AI COST CONTROLLER
========================= */

const aiUsage = {};
const AI_LIMIT = 3;

function canUseAI(userId) {
    if (!aiUsage[userId]) aiUsage[userId] = 0;

    if (aiUsage[userId] >= AI_LIMIT) return false;

    aiUsage[userId]++;
    return true;
}

/* =========================
   🤖 AI FUNCTION (SAFE PLACEHOLDER)
========================= */

async function callAI(message, memoryData) {
    return `-- AI RESPONSE (SAFE MODE)\n-- User: ${message}`;
}

/* =========================
   🚀 MAIN ROUTE
========================= */

app.post("/generate", checkKey, async (req, res) => {
    const { message, userId } = req.body;

    if (!message || !userId) {
        return res.json({
            success: false,
            error: "Missing message or userId"
        });
    }

    saveMessage(userId, "user", message);

    const templateName = getTemplate(message);

    /* =========================
       🟢 TEMPLATE FIRST (FREE)
    ========================= */

    if (templateName && TEMPLATES[templateName]) {
        return res.json({
            success: true,
            source: "template",
            script: TEMPLATES[templateName]
        });
    }

    /* =========================
       🔴 AI FALLBACK (COST CONTROLLED)
    ========================= */

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

/* =========================
   🌐 HEALTH CHECK (RENDER FIX)
========================= */

app.get("/", (req, res) => {
    res.send("ScriptForge Secure Backend Running");
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});
