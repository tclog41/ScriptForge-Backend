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

    // limit memory (cost control)
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
   🧠 SMART INTENT ROUTER (v2)
========================= */

function getTemplateFromMessage(message) {
    message = message.toLowerCase();

    const scores = {
        sprint: 0,
        door: 0,
        ui: 0,
        crouch: 0,
        pickup: 0,
        damage: 0,
        inventory: 0,
        checkpoint: 0,
        leaderstats: 0,
        stamina: 0
    };

    // ------------------------
    // 🧠 SCORING SYSTEM
    // ------------------------

    if (message.includes("run") || message.includes("sprint") || message.includes("fast")) {
        scores.sprint += 3;
    }

    if (message.includes("door") || message.includes("open")) {
        scores.door += 3;
    }

    if (message.includes("ui") || message.includes("hud") || message.includes("interface")) {
        scores.ui += 3;
    }

    if (message.includes("crouch") || message.includes("duck")) {
        scores.crouch += 3;
    }

    if (message.includes("pickup") || message.includes("item") || message.includes("grab")) {
        scores.pickup += 3;
    }

    if (message.includes("damage") || message.includes("combat") || message.includes("hit")) {
        scores.damage += 3;
    }

    if (message.includes("inventory") || message.includes("bag")) {
        scores.inventory += 3;
    }

    if (message.includes("checkpoint") || message.includes("save")) {
        scores.checkpoint += 3;
    }

    if (message.includes("leaderstats") || message.includes("coins") || message.includes("money")) {
        scores.leaderstats += 3;
    }

    if (message.includes("stamina") || message.includes("energy")) {
        scores.stamina += 3;
    }

    // ------------------------
    // 🧠 PICK BEST MATCH
    // ------------------------

    let bestMatch = null;
    let bestScore = 0;

    for (const key in scores) {
        if (scores[key] > bestScore) {
            bestScore = scores[key];
            bestMatch = key;
        }
    }

    if (bestScore === 0) return null;

    return bestMatch;
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

    return `-- AI RESPONSE\n-- CONTEXT:\n${context}\n\n-- USER: ${message}`;
}

/* =========================
   🚀 HYBRID GENERATE ROUTE
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

    const memory = getMemory(userId);

    // --------------------
    // 🥇 TEMPLATE FIRST (SMART ROUTER)
    // --------------------
    const templateName = getTemplateFromMessage(message);

    if (templateName && TEMPLATES[templateName]) {

        const template = TEMPLATES[templateName];
        const script = executeTemplate(template);

        saveMessage(userId, "assistant", script);

        return res.json({
            success: true,
            source: "template",
            template: templateName,
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
   🧪 STATUS
========================= */

app.get("/", (req, res) => {
    res.json({
        status: "ScriptForge v2 ONLINE (Hybrid + Memory + Smart Routing)",
        templates: Object.keys(TEMPLATES),
        users: Object.keys(userMemory).length
    });
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge v2 running on port ${PORT}`);
});
