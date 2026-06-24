const conflicts = {

    sprint_system: ["slow_walk_system"],
    crouch_system: ["speed_boost_overwrite"],
    stamina_system: ["infinite_stamina"]

};

function detectConflicts(selectedComponents) {

    const found = [];

    for (const comp of selectedComponents) {

        const bad = conflicts[comp];
        if (!bad) continue;

        for (const conflict of bad) {
            if (selectedComponents.includes(conflict)) {
                found.push({
                    type: "CONFLICT",
                    a: comp,
                    b: conflict
                });
            }
        }
    }

    return found;
}

module.exports = { detectConflicts };
