const { parse } = require("./parser");
const { matchAll } = require("./matcher");

const fs = require("fs");
const path = require("path");

/**
 * Load all templates from JSON files
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
function buildFromPrompt(prompt, selectedComponents = {}) {

    const templates = loadTemplates();

    const parsed = parse(prompt);

    const matches = matchAll(templates, parsed.tags || []);

    const selected = matches.slice(0, 3);

    let usedTemplates = [];
    let installMap = {};

    for (const match of selected) {

        const templateKey = match.key;
        const template = templates[templateKey];

        if (!template) continue;

        usedTemplates.push({
            key: templateKey,
            score: match.score
        });

        const components = template.components || [];

        for (const component of components) {

            const userSelected = selectedComponents[templateKey] || null;

            // RULE:
            // if plugin sends selected components → use them
            if (userSelected) {
                if (!userSelected.includes(component.id)) {
                    continue;
                }
            } else {
                // fallback mode (Step 5 behaviour)
                if (component.required === false) continue;
            }

            for (const file of component.files || []) {

                const parent = file.parent || "StarterPlayerScripts";
                const folder = file.folder || "System";

                const installKey = `${parent}/${folder}`;

                if (!installMap[installKey]) {
                    installMap[installKey] = [];
                }

                installMap[installKey].push(file);
            }
        }
    }

    // fallback safety
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

    // convert install map → structured output
    let files = [];

    for (const key in installMap) {

        const [parent, folder] = key.split("/");

        files.push({
            type: "folder",
            name: folder,
            parent: parent,
            children: installMap[key]
        });
    }

    return {
        templates: usedTemplates,
        files
    };
}

module.exports = { buildFromPrompt };
