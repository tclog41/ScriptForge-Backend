require("dotenv").config();
const express = require("express");
const { buildFromPrompt } = require("./engine/builder");

const app = express();
app.use(express.json());

app.post("/generate", (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.json({ success: false, error: "No prompt provided" });
        }

        const result = buildFromPrompt(prompt.toLowerCase());

        return res.json({
            success: true,
            template: result.template,
            files: result.files
        });

    } catch (err) {
        return res.json({
            success: false,
            error: err.message
        });
    }
});

app.listen(3000, () => {
    console.log("🚀 ScriptForge Template Engine running on port 3000");
});