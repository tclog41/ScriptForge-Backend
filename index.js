require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

const TEMPLATE_FOLDER = path.join(__dirname, "templates");

// =============================
// DATABASE SETUP
// =============================

const db = new sqlite3.Database("./scriptforge.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cache (
            prompt TEXT PRIMARY KEY,
            response TEXT,
            createdAt INTEGER
        )
    `);

    console.log("✅ Database ready");
});

// =============================
// AUTH
// =============================

function verifyKey(req, res, next) {
    const key = req.headers["x-api-key"];

    if (!key || key !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            error: "unauthorized"
        });
    }

    next();
}

// =============================
// CACHE
// =============================

function getCache(prompt) {
    return new Promise((resolve) => {
        db.get(
            "SELECT response FROM cache WHERE prompt = ?",
            [prompt],
            (err, row) => {
                if (err || !row) return resolve(null);
                resolve(JSON.parse(row.response));
            }
        );
    });
}

function saveCache(prompt, response) {
    db.run(
        `
        INSERT OR REPLACE INTO cache
        (prompt, response, createdAt)
        VALUES (?, ?, ?)
        `,
        [
            prompt,
            JSON.stringify(response),
            Date.now()
        ]
    );
}

// =============================
// TEMPLATE MATCHING
// =============================

function findTemplate(prompt) {
    try {
        const files = fs.readdirSync(TEMPLATE_FOLDER);

        let best = null;
        let bestScore = 0;

        for (const file of files) {
            if (!file.endsWith(".json")) continue;

            const data = JSON.parse(
                fs.readFileSync(
                    path.join(TEMPLATE_FOLDER, file),
                    "utf8"
                )
            );

            let score = 0;

            for (const key of (data.keywords || [])) {
                if (prompt.includes(key.toLowerCase())) {
                    score++;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = data;
            }
        }

        if (best && bestScore > 0) {
            return best;
        }

        return null;

    } catch (err) {
        console.error("Template error:", err);
        return null;
    }
}

// =============================
// AI (DeepSeek)
// =============================

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
                        content: `
You are an expert Roblox Lua developer.

RULES:
- Output ONLY valid Roblox Lua code
- No markdown
- No explanations
- No comments
- Must be production-ready
- Must work in Roblox Studio
                        `
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        const data = await res.json();

        return data?.choices?.[0]?.message?.content || "-- AI FAILED";

    } catch (err) {
        console.error(err);
        return "-- AI ERROR";
    }
}

// =============================
// NORMALISE TEMPLATE → FILES
// =============================

function formatTemplate(template) {
    return {
        success: true,
        source: "template",
        name: template.name,
        files: template.files || []
    };
}

// =============================
// MAIN GENERATE ROUTE
// =============================

app.post("/generate", verifyKey, async (req, res) => {
    try {
        const promptRaw = req.body.prompt || "";
        const prompt = promptRaw.toLowerCase().trim();

        if (!prompt) {
            return res.json({
                success: false,
                error: "missing_prompt"
            });
        }

        console.log("🔍 Prompt:", prompt);

        // =========================
        // 1. TEMPLATE MATCH
        // =========================

        const template = findTemplate(prompt);

        if (template) {
            console.log("📦 Template hit:", template.name);

            return res.json(formatTemplate(template));
        }

        // =========================
        // 2. CACHE CHECK
        // =========================

        const cached = await getCache(prompt);

        if (cached) {
            console.log("⚡ Cache hit");

            return res.json({
                success: true,
                source: "cache",
                files: cached.files
            });
        }

        // =========================
        // 3. AI FALLBACK
        // =========================

        console.log("🤖 AI generating...");

        const aiScript = await callAI(prompt);

        const aiResponse = {
            success: true,
            source: "ai",
            files: [
                {
                    name: "ScriptForgeAI",
                    type: "Script",
                    parent: "ServerScriptService",
                    source: aiScript
                }
            ]
        };

        saveCache(prompt, aiResponse);

        return res.json(aiResponse);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            error: "server_error"
        });
    }
});

// =============================
// TEMPLATE LIST
// =============================

app.get("/templates", verifyKey, (req, res) => {
    try {
        const files = fs.readdirSync(TEMPLATE_FOLDER);

        const templates = files
            .filter(f => f.endsWith(".json"))
            .map(f => {
                const data = JSON.parse(
                    fs.readFileSync(
                        path.join(TEMPLATE_FOLDER, f),
                        "utf8"
                    )
                );

                return {
                    id: f.replace(".json", ""),
                    name: data.name
                };
            });

        res.json({
            success: true,
            templates
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: "template_load_failed"
        });
    }
});

// =============================
// HEALTH CHECK
// =============================

app.get("/", (req, res) => {
    res.send("🚀 ScriptForge v2 Backend Running");
});

// =============================
// START SERVER
// =============================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
