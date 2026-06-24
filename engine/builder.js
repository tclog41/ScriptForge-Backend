const { parse } = require("./parser");
const { matchAll } = require("./matcher");

const fs = require("fs");
const path = require("path");

/**
 * Load all templates from /templates
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
 * MAIN BUILDER
 */
function buildFromPrompt(prompt) {

    const templates = loadTemplates();

    const parsed = parse(prompt);

    const matches = matchAll(templates, parsed.tags || []);

    const selected = matches.slice(0, 3);

    let usedTemplates = [];

    // STEP 4: Smart Installer Map
    const installMap = {};

    for (const match of selected) {

        const template = templates[match.key];
        if (!template || !template.files) continue;

        usedTemplates.push({
            key: match.key,
            score: match.score
        });

        for (const file of template.files) {

            const parent = file.parent || "StarterPlayerScripts";
            const folder = file.folder || "System";

            const installKey = `${parent}/${folder}`;

            if (!installMap[installKey]) {
                installMap[installKey] = [];
            }

            installMap[installKey].push(file);
        }
    }

    // Fallback (never empty)
    if (Object.keys(installMap).length === 0) {
        installMap["StarterPlayerScripts/System"] = [
            {
                name: "Fallback",
                type: "LocalScript",
                parent: "StarterPlayerScripts",
                folder: "System",
                source: `print("No template matched")`
            }
        ];

        usedTemplates.push({
            key: "fallback",
            score: 0
        });
    }

    // Convert map → structured output
    let files = [];

    for (const installKey in installMap) {

        const [parent, folder] = installKey.split("/");

        files.push({
            type: "folder",
            name: folder,
            parent: parent,
            children: installMap[installKey]
        });
    }

    return {
        templates: usedTemplates,
        files
    };
}

module.exports = { buildFromPrompt };
