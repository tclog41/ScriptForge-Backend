const { parseKeywords } = require("./parser");
const { templates } = require("./templates");
const { findBestTemplate } = require("./matcher");

function buildFromPrompt(prompt) {

    const parsed = parseKeywords(prompt);

    const best = findBestTemplate(parsed.tags, templates);

    if (!best) {
        return {
            template: null,
            files: []
        };
    }

    return {
        template: best,
        files: templates[best].files
    };
}

module.exports = { buildFromPrompt };