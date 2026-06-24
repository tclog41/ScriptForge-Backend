const { templates } = require("./templates");
const { selectPacks } = require("./packSelector");

function resolve(id, resolved, output) {

    if (resolved.has(id)) return;
    resolved.add(id);

    const comp = templates[id];
    if (!comp) return;

    // dependencies first
    if (comp.dependencies) {
        for (const dep of comp.dependencies) {
            resolve(dep, resolved, output);
        }
    }

    output.push({
        id: comp.id,
        name: comp.name,
        category: comp.category,
        source: comp.build()
    });
}

function buildFromPrompt(prompt) {

    const packs = selectPacks(prompt);

    let resolved = new Set();
    let output = [];

    let usedPacks = [];

    for (const pack of packs) {

        usedPacks.push({
            id: pack.id,
            name: pack.name,
            priority: pack.priority
        });

        for (const compId of pack.components) {
            resolve(compId, resolved, output);
        }
    }

    return {
        packs: usedPacks,
        files: output
    };
}

module.exports = { buildFromPrompt };
