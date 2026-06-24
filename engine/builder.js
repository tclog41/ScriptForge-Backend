const { parse } = require("./parser");
const { matchAll } = require("./matcher");

const fs = require("fs");
const path = require("path");

/**
 * Load all JSON templates dynamically
 */
function loadTemplates() {
    const templates = {};

    const dir = path.join(__dirname, "../templates");

    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(dir, file);

        try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

            const key = file.replace(".json", "");
            templates[key] = data;

        } catch (err) {
            console.log("Template load error:", file, err.message);
        }
    }

    return templates;
}

/**
 * Main builder function
 */
function buildFromPrompt(prompt) {

    // 1. load templates every request (safe for now)
    const templates = loadTemplates();

    // 2. parse user input
    const parsed = parse(prompt);

    // 3. match templates using scoring system
    const matches = matchAll(templates, parsed.tags || []);

    // 4. take top 3 results max
    const selected = matches.slice(0, 3);

    let files = [];
    let usedTemplates = [];

    // 5. merge files from selected templates
    for (const match of selected) {

        const template = templates[match.key];

        if (!template || !template.files) continue;

        usedTemplates.push({
            key: match.key,
            score: match.score
        });

        files.push(...template.files);
    }

    // 6. fallback system (never empty response)
    if (files.length === 0) {
        files.push({
            name: "Fallback",
            type: "LocalScript",
            parent: "StarterPlayerScripts",
            folder: "System",
            source: `print("No template matched")`
        });

        usedTemplates.push({
            key: "fallback",
            score: 0
        });
    }

    return {
        templates: usedTemplates,
        files
    };
}

module.exports = { buildFromPrompt };
