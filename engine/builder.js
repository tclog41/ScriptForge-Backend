const { templates } = require("./templates");
const { selectPack } = require("./packSelector");

function resolve(id, resolved, output) {

    if (resolved.has(id)) return;
    resolved.add(id);

    const comp = templates[id];
    if (!comp) return;

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

    const pack = selectPack(prompt);

    let resolved = new Set();
    let output = [];

    for (const id of pack.components) {
        resolve(id, resolved, output);
    }

    return {
        pack,
        files: output
    };
}

module.exports = { buildFromPrompt };
