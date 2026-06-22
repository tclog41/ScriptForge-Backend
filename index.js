const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

/* =========================
   🧠 MEMORY SYSTEM
========================= */

const userMemory = {};

function saveMessage(userId, role, message) {
    if (!userMemory[userId]) {
        userMemory[userId] = {
            messages: [],
            createdAt: Date.now()
        };
    }

    userMemory[userId].messages.push({
        role,
        message,
        time: Date.now()
    });

    // limit memory size (cost saver)
    if (userMemory[userId].messages.length > 30) {
        userMemory[userId].messages.shift();
    }
}

function getMemory(userId) {
    if (!userMemory[userId]) return [];

    return userMemory[userId].messages.map(m => ({
        role: m.role,
        content: m.message
    }));
}

// auto delete memory after 24h
function cleanupMemory() {
    const now = Date.now();

    Object.keys(userMemory).forEach(userId => {
        const data = userMemory[userId];

        if (now - data.createdAt > 24 * 60 * 60 * 1000) {
            delete userMemory[userId];
        }
    });
}

setInterval(cleanupMemory, 10 * 60 * 1000);

/* =========================
   📁 TEMPLATE SYSTEM
========================= */

const templatesPath = path.join(__dirname, "templates");

function loadTemplates() {
    const templates = {};

    if (!fs.existsSync(templatesPath)) {
        console.log("❌ Templates folder missing");
        return templates;
    }

    const files = fs.readdirSync(templatesPath);

    files.forEach(file => {
        if (file.endsWith(".json")) {
            const filePath = path.join(templatesPath, file);
            const data = fs.readFileSync(filePath, "utf-8");

            try {
                const template = JSON.parse(data);
                templates[template.name] = template;
            } catch (err) {
                console.log("Error loading template:", file);
            }
        }
    });

    return templates;
}

let TEMPLATES = loadTemplates();

console.log("✅ Templates loaded:", Object.keys(TEMPLATES));

/* =========================
   🔍 TEMPLATE ROUTER
========================= */

function getTemplateFromMessage(message) {
    message = message.toLowerCase();

    if (message.includes("sprint")) return "sprint";
    if (message.includes("door")) return "door";
    if (message.includes("ui")) return "ui";

    return null;
}

/* =========================
   ⚙️ TEMPLATE EXECUTOR
========================= */

function executeTemplate(template) {
    let code = template.code;

    if (template.variables) {
        Object.keys(template.variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, "g");
            code = code.replace(regex, template.variables[key]);
        });
    }

    return code;
}

/* =========================
   🤖 AI FUNCTION (PLACEHOLDER)
========================= */

async function callAI({ message, memory }) {
    const context = memory
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");

    // Replace with DeepSeek/OpenAI later
    return `-- AI RESPONSE\n-- CONTEXT:\n${context}\n\n-- USER: ${message}`;
}

/* =========================
   🚀 MAIN GENERATE ROUTE (HYBRID SYSTEM)
========================= */

app.post("/generate", async (req, res) => {
    const message = req.body.message;
    const userId = req.body.userId;

    if (!message || !userId) {
        return res.json({
            success: false,
            error: "Missing message or userId"
        });
    }

    // --------------------
    // 🧠 SAVE USER MESSAGE
    // --------------------
    saveMessage(userId, "user", message);

    // --------------------
    // 🧠 GET MEMORY
    // --------------------
    const memory = getMemory(userId);

    // --------------------
    // 🥇 TEMPLATE FIRST
    // --------------------
    const templateName = getTemplateFromMessage(message);

    if (templateName && TEMPLATES[templateName]) {

        const template = TEMPLATES[templateName];
        const script = executeTemplate(template);

        saveMessage(userId, "assistant", script);

        return res.json({
            success: true,
            source: "template",
            script
        });
    }

    // --------------------
    // 🤖 AI FALLBACK
    // --------------------

    const aiResult = await callAI({ message, memory });

    saveMessage(userId, "assistant", aiResult);

    return res.json({
        success: true,
        source: "ai",
        script: aiResult
    });
});

/* =========================
   📦 TEMPLATE ROUTES
========================= */

app.get("/template/:name", (req, res) => {
    const name = req.params.name;

    if (!TEMPLATES[name]) {
        return res.json({
            success: false,
            error: "Template not found"
        });
    }

    res.json({
        success: true,
        template: TEMPLATES[name]
    });
});

app.get("/reload-templates", (req, res) => {
    TEMPLATES = loadTemplates();

    res.json({
        success: true,
        templates: Object.keys(TEMPLATES)
    });
});

/* =========================
   🧪 STATUS ROUTE
========================= */

app.get("/", (req, res) => {
    res.json({
        status: "ScriptForge FULL SYSTEM ONLINE",
        templates: Object.keys(TEMPLATES),
        users: Object.keys(userMemory).length
    });
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge running on port ${PORT}`);
});
