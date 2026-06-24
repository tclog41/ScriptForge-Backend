function parse(prompt) {

    // 1. clean input
    let text = prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")   // remove symbols
        .replace(/\s+/g, " ")           // remove extra spaces
        .trim();

    // 2. split into words
    let words = text.split(" ");

    // 3. remove useless words (stop words)
    const stopWords = [
        "a", "the", "to", "for", "of", "and", "can", "you",
        "make", "me", "my", "please", "really", "good",
        "system", "script", "roblox", "add", "give", "create"
    ];

    words = words.filter(word => !stopWords.includes(word));

    // 4. remove duplicates
    const unique = [...new Set(words)];

    // 5. detect simple intent tags
    const tags = [...unique];

    // optional: add inferred tags
    if (text.includes("ui") || text.includes("interface")) {
        tags.push("ui");
    }

    if (text.includes("sprint") || text.includes("run") || text.includes("speed")) {
        tags.push("movement");
    }

    if (text.includes("combat") || text.includes("fight") || text.includes("damage")) {
        tags.push("combat");
    }

    if (text.includes("health") || text.includes("hp")) {
        tags.push("health");
    }

    return {
        tags
    };
}

module.exports = { parse };
