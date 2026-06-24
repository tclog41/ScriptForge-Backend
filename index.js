app.post("/generate", (req, res) => {
    try {

        const { prompt } = req.body;

        const result = buildFromPrompt(prompt);

        return res.json({
            success: true,
            packs: result.packs,
            conflicts: result.conflicts,
            components: result.files
        });

    } catch (err) {
        return res.json({
            success: false,
            error: err.message
        });
    }
});
