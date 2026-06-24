require("dotenv").config();
const express = require("express");
const { buildFromPrompt } = require("./engine/builder");

const app = express();
app.use(express.json());

app.post("/generate", (req, res) => {
    try {

        const { prompt, selectedComponents } = req.body;

        console.log("PROMPT:", prompt);

        const result = buildFromPrompt(
            prompt.toLowerCase(),
            selectedComponents || {}
        );

        console.log("FILES:", result.files.length);

        res.json({
            success: true,
            templates: result.templates,
            files: result.files,
            components: result.components
        });

    } catch (err) {
        console.log("ERROR:", err);
        res.json({
            success: false,
            error: err.message
        });
    }
});

app.listen(3000, () => {
    console.log("ScriptForge running...");
});
