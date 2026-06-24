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

    let selectedComponents = [];

    for (const p of packs) {
        selectedComponents.push(...p.components);
    }

    // STEP 1: detect conflicts
    const conflicts = detectConflicts(selectedComponents);

    // STEP 2: auto-fix conflicts (REMOVE weaker systems)
    const blocked = new Set();

    for (const c of conflicts) {
        blocked.add(c.b); // remove conflicting one
    }

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

            if (blocked.has(compId)) continue;

            resolve(compId, resolved, output);
        }
    }

    return {
        packs: usedPacks,
        conflicts,
        files: output
    };
}

module.exports = { buildFromPrompt };
