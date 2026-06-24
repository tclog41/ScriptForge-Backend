const { parse } = require("./parser");
const { templates } = require("./templates");
const { matchAll } = require("./matcher");

function buildFromPrompt(prompt) {

    const parsed = parse(prompt);

    const matches = matchAll(templates, parsed.tags);

    // take top 3 systems max (prevents spam)
    const selected = matches.slice(0, 3);

    let files = [];
    let usedTemplates = [];

    for (const m of selected) {
        usedTemplates.push(m.key);
        files.push(...templates[m.key].files);
    }

    // fallback (never empty)
    if (files.length === 0) {
        files.push({
            name: "Fallback",
            type: "LocalScript",
            parent: "StarterPlayerScripts",
            folder: "System",
            source: `print("No template matched")`
        });
    }

    return {
        templates: usedTemplates,
        files
    };
}

module.exports = { buildFromPrompt };