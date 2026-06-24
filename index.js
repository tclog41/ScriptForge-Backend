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
