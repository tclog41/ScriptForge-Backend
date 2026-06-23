require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TEMPLATE_FOLDER = path.join(__dirname, "templates");

// =========================
// 🔐 AUTH
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

// =========================
// 📦 LOAD TEMPLATE FROM FILE
// =========================

function loadTemplate(id) {
    try {
        const filePath = path.join(TEMPLATE_FOLDER, `${id}.json`);

        if (!fs.existsSync(filePath)) return null;

        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);

    } catch (err) {
        return null;
    }
}

// =========================
// 🤖 AI CALL
// =========================

async function callAI(prompt) {
    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a Roblox Lua expert. Output ONLY clean working Lua code."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        const data = await res.json();
        return data?.choices?.[0]?.message?.content || "-- AI ERROR";

    } catch (err) {
        return "-- SERVER ERROR";
    }
}

// =========================
// 🔥 GENERATE ENDPOINT
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const {
        userId,
        mode,
        template,
        prompt,
        existingScript
    } = req.body;

    let finalPrompt = "";

    // =========================
    // ✏ EDIT MODE
    // =========================

    if (mode === "edit") {
        finalPrompt = `
You are editing a Roblox script.

Rules:
- Only change what is requested
- Keep structure clean
- Do NOT break existing systems
- Return full updated script

EXISTING SCRIPT:
${existingScript}

USER REQUEST:
${prompt}
`;
    }

    // =========================
    // 🧠 TEMPLATE MODE
    // =========================

    else {
        const tpl = loadTemplate(template);

        if (!tpl) {
            return res.json({
                success: false,
                error: "template_not_found"
            });
        }

        finalPrompt = `
${tpl.prompt}

USER REQUEST:
${prompt}
`;
    }

    // =========================
    // 🤖 AI REQUEST
    // =========================

    const script = await callAI(finalPrompt);

    res.json({
        success: true,
        script
    });
});

// =========================
// 📋 LIST TEMPLATES
// =========================

app.get("/templates", verifyKey, (req, res) => {
    try {
        const files = fs.readdirSync(TEMPLATE_FOLDER);

        const templates = files
            .filter(f => f.endsWith(".json"))
            .map(file => {
                const id = file.replace(".json", "");
                const data = loadTemplate(id);

                return {
                    id,
                    name: data?.name || id
                };
            });

        res.json({
            success: true,
            templates
        });

    } catch (err) {
        res.json({
            success: false,
            error: "failed_to_load_templates"
        });
    }
});

// =========================
// 🚀 HEALTH CHECK
// =========================

app.get("/", (req, res) => {
    res.send("🚀 ScriptForge v11 Backend Running");
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge v11 running on port ${PORT}`);
});
