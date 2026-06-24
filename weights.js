const weights = require("./weights");

function score(templateTags, userTags) {
    let s = 0;

    for (const t of userTags) {
        if (templateTags.includes(t)) {
            s += weights[t] || 1;
        }
    }

    return s;
}

function matchAll(templates, tags) {
    const results = [];

    for (const key in templates) {
        const t = templates[key];
        const s = score(t.tags, tags);

        if (s > 0) {
            results.push({ key, score: s });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

module.exports = { matchAll };