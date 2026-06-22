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
// 🌐 MAIN GENERATE ROUTE
// --------------------

app.post("/generate", (req, res) => {
    const message = req.body.message;

    if (!message) {
        return res.json({
            success: false,
            error: "No message provided"
        });
    }

    const templateName = getTemplateFromMessage(message);

    if (!templateName || !TEMPLATES[templateName]) {
        return res.json({
            success: false,
            source: "none",
            message: "No template found (AI fallback not added yet)"
        });
    }

    const template = TEMPLATES[templateName];
    const output = executeTemplate(template);

    res.json({
        success: true,
        source: "template",
        template: templateName,
        script: output
    });
});

// --------------------
// 📦 GET SINGLE TEMPLATE
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
// 🧪 STATUS ROUTE
// --------------------

app.get("/", (req, res) => {
    res.json({
        status: "ScriptForge Backend Online",
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
