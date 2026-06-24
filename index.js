require("dotenv").config();
const express = require("express");
const { buildFromPrompt } = require("./engine/builder");

const app = express();
app.use(express.json());

app.post("/generate", (req, res) => {
    try {
        const { prompt, selectedComponents } = req.body;

        if (!prompt) {
            return res.json({
                success: false,
                error: "No prompt provided"
            });
        }

        const result = buildFromPrompt(
            prompt.toLowerCase(),
            selectedComponents || {}
        );

        return res.json({
            success: true,
            templates: result.templates,
            files: result.files,
            components: result.components
        });

    } catch (err) {
        return res.json({
            success: false,
            error: err.message
        });
    }
});

app.listen(3000, () => {
    console.log("🚀 ScriptForge running on port 3000");
});
