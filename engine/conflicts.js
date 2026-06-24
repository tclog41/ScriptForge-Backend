const conflicts = {
    sprint_system: ["slow_walk_system"],
    crouch_system: ["speed_boost_overwrite"],
    stamina_system: ["infinite_stamina"]
};

function detectConflicts(list) {

    const found = [];

    for (const item of list) {
        const bad = conflicts[item];
        if (!bad) continue;

        for (const c of bad) {
            if (list.includes(c)) {
                found.push({
                    a: item,
                    b: c
                });
            }
        }
    }

    return found;
}

module.exports = { detectConflicts };
