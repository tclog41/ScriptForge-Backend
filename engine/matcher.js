function matchAll(templates, inputTags) {
    const results = [];

    for (const key in templates) {
        const template = templates[key];

        let score = 0;

        // 1. TAG MATCHING (base system)
        if (template.tags) {
            for (const tag of template.tags) {
                if (inputTags.includes(tag)) {
                    score += 10; // strong match
                }
            }
        }

        // 2. KEYWORD MATCHING (IMPORTANT UPGRADE)
        if (template.keywords) {
            for (const keyword of template.keywords) {
                if (inputTags.includes(keyword)) {
                    score += 5;
                }
            }
        }

        // 3. EXACT NAME BONUS (rare but powerful)
        if (inputTags.includes(key)) {
            score += 20;
        }

        // 4. CATEGORY BOOST (future-proofing)
        if (template.category) {
            if (inputTags.includes(template.category.toLowerCase())) {
                score += 3;
            }
        }

        // only keep if it has some relevance
        if (score > 0) {
            results.push({
                key,
                score
            });
        }
    }

    // sort best first
    results.sort((a, b) => b.score - a.score);

    return results;
}

module.exports = { matchAll };
