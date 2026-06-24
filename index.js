require("dotenv").config();
const express = require("express");

const { buildFromPrompt } = require("./engine/builder");

const app = express(); // 🔥 THIS WAS MISSING
app.use(express.json());

// =========================
// GENERATE ROUTE
// =========================
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
            conflicts: result.conflicts || [],
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

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 ScriptForge ENGINE v2 running on port", PORT);
});
