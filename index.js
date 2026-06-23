require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TEMPLATE_FOLDER = path.join(__dirname, "templates");

// =========================
// DATABASE
// =========================

const db = new sqlite3.Database("./scriptforge.db");

// create cache table
db.run(`
CREATE TABLE IF NOT EXISTS cache (
    prompt TEXT PRIMARY KEY,
    script TEXT,
    createdAt INTEGER
)
`);

// =========================
// AUTH
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

// =========================
// TEMPLATE LOADER
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
// CACHE SYSTEM
// =========================

function getCache(prompt) {
    return new Promise((resolve) => {
        db.get(
            "SELECT script FROM cache WHERE prompt = ?",
            [prompt],
            (err, row) => {
                if (err || !row) return resolve(null);
                resolve(row.script);
            }
        );
    });
}

function saveCache(prompt, script) {
    db.run(
        "INSERT OR REPLACE INTO cache (prompt, script, createdAt) VALUES (?, ?, ?)",
        [prompt, script, Date.now()]
    );
}

// =========================
// AI CALL (DeepSeek)
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
                        content: "You are a Roblox Lua expert. Output ONLY working Lua code. No explanations."
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
// MAIN GENERATE SYSTEM
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const { template, prompt } = req.body;

    // =========================
    // 1. TEMPLATE CHECK
    // =========================
    const tpl = loadTemplate(template);

    if (tpl) {

        // STATIC TEMPLATE
        if (tpl.type === "static") {
            return res.json({
                success: true,
                source: "template",
                script: tpl.script
            });
        }

        // AI TEMPLATE
        const aiPrompt = tpl.prompt + "\n\nUSER REQUEST:\n" + prompt;
        const script = await callAI(aiPrompt);

        return res.json({
            success: true,
            source: "ai-template",
            script
        });
    }

    // =========================
    // 2. CACHE CHECK
    // =========================
    const cached = await getCache(prompt);

    if (cached) {
        return res.json({
            success: true,
            source: "cache",
            script: cached
        });
    }

    // =========================
    // 3. AI FALLBACK
    // =========================
    const script = await callAI(prompt);

    // save to cache
    saveCache(prompt, script);

    return res.json({
        success: true,
        source: "ai-fallback",
        script
    });
});

// =========================
// LIST TEMPLATES
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
                    name: data?.name || id,
                    type: data?.type || "ai"
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
// HEALTH CHECK
// =========================

app.get("/", (req, res) => {
    res.send("🚀 ScriptForge v11 (Template → Cache → AI)");
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge running on port ${PORT}`);
});
