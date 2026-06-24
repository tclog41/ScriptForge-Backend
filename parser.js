function parseKeywords(text) {
    const tags = [];

    if (text.includes("ui")) tags.push("ui");
    if (text.includes("hud")) tags.push("ui");

    if (text.includes("health")) tags.push("health");

    if (text.includes("sprint")) tags.push("movement");
    if (text.includes("run")) tags.push("movement");

    if (text.includes("combat")) tags.push("combat");
    if (text.includes("fight")) tags.push("combat");

    if (text.includes("inventory")) tags.push("inventory");

    if (text.includes("door")) tags.push("door");

    return {
        raw: text,
        tags
    };
}

module.exports = { parseKeywords };