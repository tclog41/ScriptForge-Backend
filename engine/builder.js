const { templates } = require("./templates");
const { selectPacks } = require("./packSelector");
const { detectConflicts } = require("./conflicts");

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

    const packs = selectPacks(prompt);

    let all = [];

    for (const p of packs) {
        all.push(...p.components);
    }

    const conflicts = detectConflicts(all);

    const blocked = new Set();
    for (const c of conflicts) {
        blocked.add(c.b);
    }

    let resolved = new Set();
    let output = [];

    for (const pack of packs) {
        for (const id of pack.components) {
            if (blocked.has(id)) continue;
            resolve(id, resolved, output);
        }
    }

    return {
        packs,
        conflicts,
        files: output
    };
}

module.exports = { buildFromPrompt };
