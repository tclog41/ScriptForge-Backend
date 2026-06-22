const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// --------------------
// 📁 TEMPLATE LOADER
// --------------------

const templatesPath = path.join(__dirname, "templates");

function loadTemplates() {
    const templates = {};

    // check folder exists
    if (!fs.existsSync(templatesPath)) {
        console.log("Templates folder not found!");
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
                console.log("Error loading template:", file, err.message);
            }
        }
    });

    return templates;
}

// Load templates into memory
let TEMPLATES = loadTemplates();

console.log("✅ Templates loaded:", Object.keys(TEMPLATES));

// --------------------
// 🔄 RELOAD TEMPLATES (DEV ONLY)
// --------------------
app.get("/reload-templates", (req, res) => {
    TEMPLATES = loadTemplates();
    res.json({
        message: "Templates reloaded",
        templates: Object.keys(TEMPLATES)
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
// 🧪 TEST ROUTE
// --------------------
app.get("/", (req, res) => {
    res.json({
        status: "ScriptForge Template Engine Running",
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
