const { parse } = require("./parser");
const { matchAll } = require("./matcher");

const fs = require("fs");
const path = require("path");

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

function buildFromPrompt(prompt, selectedComponents = {}) {

    const templates = loadTemplates();

    // DEBUG SAFE PARSE (don’t rely on tags)
    let parsed;
    try {
        parsed = parse(prompt);
    } catch (e) {
        parsed = { tags: [prompt] };
    }

    const tags = (parsed.tags && parsed.tags.length > 0)
        ? parsed.tags
        : [prompt];

    console.log("DEBUG TAGS:", tags);

    // FORCE match reliability
    let matches = [];

    try {
        matches = matchAll(templates, tags);
    } catch (e) {
        console.log("MATCH ERROR:", e.message);
    }

    // fallback: if matcher fails, pick all templates
    if (!matches || matches.length === 0) {
        matches = Object.keys(templates).map(k => ({
            key: k,
            score: 1
        }));
    }

    const selected = matches.slice(0, 3);

    let installMap = {};
    let usedTemplates = [];
    let componentsOut = [];

    for (const match of selected) {

        const templateKey = match.key;
        const template = templates[templateKey];

        if (!template) continue;

        usedTemplates.push({
            key: templateKey,
            score: match.score || 1
        });

        const components = template.components || [];

        for (const component of components) {

            componentsOut.push({
                template: templateKey,
                id: component.id,
                name: component.name,
                required: component.required || false
            });

            const userSelected = selectedComponents[templateKey] || null;

            // selection logic
            if (userSelected) {
                if (!userSelected.includes(component.id)) continue;
            } else {
                if (component.required === false) continue;
            }

            for (const file of component.files || []) {

                const parent = file.parent || "StarterPlayerScripts";
                const folder = file.folder || "System";

                const key = `${parent}/${folder}`;

                if (!installMap[key]) {
                    installMap[key] = [];
                }

                installMap[key].push(file);
            }
        }
    }

    // HARD FALLBACK (NEVER EMPTY)
    if (Object.keys(installMap).length === 0) {
        console.log("WARNING: installMap empty, forcing fallback");

        installMap["StarterPlayerScripts/System"] = [
            {
                name: "FallbackScript",
                type: "LocalScript",
                parent: "StarterPlayerScripts",
                folder: "System",
                source: `print("ScriptForge fallback working")`
            }
        ];
    }

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

    console.log("FINAL FILES:", JSON.stringify(files, null, 2));

    return {
        templates: usedTemplates,
        files,
        components: componentsOut
    };
}

module.exports = { buildFromPrompt };
