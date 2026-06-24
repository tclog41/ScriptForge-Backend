function score(templateTags, userTags) {
    let s = 0;

    for (const t of userTags) {
        if (templateTags.includes(t)) {
            s += 10;
        }
    }

    return s;
}

function findBestTemplate(tags, templates) {
    let bestKey = null;
    let bestScore = 0;

    for (const key in templates) {
        const t = templates[key];
        const s = score(t.tags, tags);

        if (s > bestScore) {
            bestScore = s;
            bestKey = key;
        }
    }

    return bestKey;
}

module.exports = { findBestTemplate };