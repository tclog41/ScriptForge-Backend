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

        const data = JSON.parse(
            fs.readFileSync(path.join(dir, file), "utf8")
        );

        const key = file.replace(".json", "");
        templates[key] = data;
    }

    return templates;
}

function buildFromPrompt(prompt, selectedComponents = {}) {

    const templates = loadTemplates();

    let parsed;
    try {
        parsed = parse(prompt);
    } catch (e) {
        parsed = { tags: [prompt] };
    }

    const tags = parsed.tags?.length ? parsed.tags : [prompt];

    let matches = matchAll(templates, tags);

    if (!matches || matches.length === 0) {
        matches = Object.keys(templates).map(k => ({
            key: k,
            score: 1
        }));
    }

    const selected = matches.slice(0, 3);

    let installMap = {};
    let componentsOut = [];

    for (const match of selected) {

        const template = templates[match.key];
        if (!template) continue;

        const components = template.components || [];

        for (const c of components) {

            componentsOut.push({
                template: match.key,
                id: c.id,
                name: c.name,
                required: !!c.required
            });

            const userSelection = selectedComponents?.[match.key];

            const enabled =
                c.required === true ||
                (userSelection && userSelection.includes(c.id));

            if (!enabled) continue;

            for (const file of c.files || []) {

                const key = `${file.parent}/${file.folder}`;

                if (!installMap[key]) installMap[key] = [];

                installMap[key].push(file);
            }
        }
    }

    if (Object.keys(installMap).length === 0) {
        installMap["StarterPlayerScripts/System"] = [
            {
                name: "Fallback",
                type: "LocalScript",
                parent: "StarterPlayerScripts",
                folder: "System",
                source: `print("ScriptForge fallback loaded")`
            }
        ];
    }

    const files = [];

    for (const key in installMap) {
        const [parent, folder] = key.split("/");

        files.push({
            type: "folder",
            name: folder,
            parent,
            children: installMap[key]
        });
    }

    return {
        templates: selected,
        files,
        components: componentsOut
    };
}

module.exports = { buildFromPrompt };
