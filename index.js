const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// --------------------
// 📁 TEMPLATE SYSTEM
// --------------------

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

// --------------------
// 🔍 TEMPLATE ROUTER
// --------------------

function getTemplateFromMessage(message) {
    message = message.toLowerCase();

    if (message.includes("sprint")) return "sprint";
    if (message.includes("door")) return "door";
    if (message.includes("ui")) return "ui";

    return null;
}

// --------------------
// ⚙️ TEMPLATE EXECUTOR
// --------------------

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

// --------------------
// 🤖 AI FUNCTION (PLACEHOLDER)
// --------------------

// This is where your DeepSeek/OpenAI call goes
async function callAI(message) {
    // Replace this with real API call later
    return `-- AI GENERATED SCRIPT\n-- User request: ${message}`;
}

// --------------------
// 🚀 HYBRID GENERATE ROUTE
// --------------------

app.post("/generate", async (req, res) => {
    const message = req.body.message;

    if (!message) {
        return res.json({
            success: false,
            error: "No message provided"
        });
    }

    // --------------------
    // 🥇 STEP 1: TEMPLATE CHECK
    // --------------------
    const templateName = getTemplateFromMessage(message);

    if (templateName && TEMPLATES[templateName]) {

        const template = TEMPLATES[templateName];

        let script = executeTemplate(template);

        // --------------------
        // 🥈 OPTIONAL AI ENHANCEMENT (LOW COST MODE)
        // --------------------
        const enhanced = false; // set true later if you want AI upgrade

        if (enhanced) {
            const aiAdd = await callAI(
                `Improve this Roblox script without changing core logic:\n${script}`
            );

            script += "\n\n-- AI Enhancement:\n" + aiAdd;
        }

        return res.json({
            success: true,
            source: "template",
            template: templateName,
            script: script
        });
    }

    // --------------------
    // 🥈 STEP 2: AI FALLBACK (NO TEMPLATE FOUND)
    // --------------------

    const aiResult = await callAI(message);

    return res.json({
        success: true,
        source: "ai",
        script: aiResult
    });
});

// --------------------
// 📦 GET TEMPLATE
// --------------------

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

// --------------------
// 🔄 RELOAD TEMPLATES
// --------------------

app.get("/reload-templates", (req, res) => {
    TEMPLATES = loadTemplates();

    res.json({
        success: true,
        message: "Templates reloaded",
        templates: Object.keys(TEMPLATES)
    });
});

// --------------------
// 🧪 STATUS
// --------------------

app.get("/", (req, res) => {
    res.json({
        status: "ScriptForge Hybrid AI Online",
        templates: Object.keys(TEMPLATES)
    });
});

// --------------------
// 🚀 START SERVER
// --------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
