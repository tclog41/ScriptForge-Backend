require("dotenv").config();
const express = require("express");
const { buildFromPrompt } = require("./engine/builder");

const app = express();
app.use(express.json());

app.post("/generate", (req, res) => {
    try {

        const { prompt } = req.body;

        if (!prompt) {
            return res.json({
                success: false,
                error: "No prompt provided"
            });
        }

        const result = buildFromPrompt(prompt);

        return res.json({
            success: true,
            packs: result.packs,
            conflicts: result.conflicts,
            components: result.files
        });

    } catch (err) {
        console.error(err);

        return res.json({
            success: false,
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 ScriptForge running on port", PORT);
});
