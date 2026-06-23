require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

const TEMPLATE_FOLDER = path.join(__dirname, "templates");

// ========================================
// DATABASE
// ========================================

const db = new sqlite3.Database("./scriptforge.db");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS cache (
            prompt TEXT PRIMARY KEY,
            script TEXT NOT NULL,
            createdAt INTEGER NOT NULL
        )
    `);

    console.log("✅ Database Ready");

});

// ========================================
// API KEY AUTH
// ========================================

function verifyKey(req, res, next) {

    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({
            success: false,
            error: "unauthorized"
        });
    }

    next();
}

// ========================================
// CACHE HELPERS
// ========================================

function getCache(prompt) {

    return new Promise((resolve) => {

        db.get(
            "SELECT script FROM cache WHERE prompt = ?",
            [prompt],
            (err, row) => {

                if (err || !row) {
                    return resolve(null);
                }

                resolve(row.script);

            }
        );

    });

}

function saveCache(prompt, script) {

    db.run(
        `
        INSERT OR REPLACE INTO cache
        (prompt, script, createdAt)
        VALUES (?, ?, ?)
        `,
        [
            prompt,
            script,
            Date.now()
        ]
    );

}

// ========================================
// TEMPLATE SEARCH
// ========================================

function findTemplate(prompt) {

    try {

        const files = fs.readdirSync(TEMPLATE_FOLDER);

        let bestMatch = null;
        let bestScore = 0;

        for (const file of files) {

            if (!file.endsWith(".json")) continue;

            const fullPath = path.join(
                TEMPLATE_FOLDER,
                file
            );

            const template = JSON.parse(
                fs.readFileSync(fullPath, "utf8")
            );

            let score = 0;

            const keywords =
                template.keywords || [];

            for (const keyword of keywords) {

                if (
                    prompt.includes(
                        keyword.toLowerCase()
                    )
                ) {
                    score++;
                }

            }

            if (score > bestScore) {

                bestScore = score;
                bestMatch = template;

            }

        }

        if (
            bestMatch &&
            bestScore > 0 &&
            bestMatch.script
        ) {

            return {
                found: true,
                template: bestMatch
            };

        }

        return {
            found: false
        };

    } catch (err) {

        console.error(err);

        return {
            found: false
        };

    }

}

// ========================================
// DEEPSEEK
// ========================================

async function callAI(prompt) {

    try {

        const response = await fetch(
            "https://api.deepseek.com/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${process.env.DEEPSEEK_KEY}`
                },

                body: JSON.stringify({

                    model: "deepseek-chat",

                    messages: [

                        {
                            role: "system",

                            content: `
You are an expert Roblox Lua developer.

Rules:

- Output ONLY Roblox Lua code.
- No markdown.
- No explanations.
- No code fences.
- Roblox Studio compatible.
- Production-ready code.
- Return the complete script.
`
                        },

                        {
                            role: "user",
                            content: prompt
                        }

                    ]

                })

            }
        );

        const data =
            await response.json();

        return (
            data?.choices?.[0]?.message?.content ||
            "-- AI_GENERATION_FAILED"
        );

    } catch (err) {

        console.error(err);

        return "-- AI_SERVER_ERROR";

    }

}

// ========================================
// GENERATE
// ========================================

app.post(
    "/generate",
    verifyKey,
    async (req, res) => {

        try {

            const prompt =
                (
                    req.body.prompt || ""
                )
                    .trim()
                    .toLowerCase();

            if (!prompt) {

                return res.json({
                    success: false,
                    error: "missing_prompt"
                });

            }

            console.log(
                `🔍 Request: ${prompt}`
            );

            // =================================
            // STEP 1
            // TEMPLATE SEARCH
            // =================================

            const templateResult =
                findTemplate(prompt);

            if (templateResult.found) {

                console.log(
                    `📦 Template Match: ${templateResult.template.name}`
                );

                return res.json({

                    success: true,

                    source: "template",

                    template:
                        templateResult.template.name,

                    script:
                        templateResult.template.script

                });

            }

            // =================================
            // STEP 2
            // CACHE
            // =================================

            const cached =
                await getCache(prompt);

            if (cached) {

                console.log(
                    "⚡ Cache Hit"
                );

                return res.json({

                    success: true,

                    source: "cache",

                    script: cached

                });

            }

            // =================================
            // STEP 3
            // AI
            // =================================

            console.log(
                "🤖 AI Generation"
            );

            const script =
                await callAI(prompt);

            saveCache(
                prompt,
                script
            );

            return res.json({

                success: true,

                source: "ai",

                script

            });

        } catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                error: "server_error"

            });

        }

    }
);

// ========================================
// TEMPLATE LIST
// ========================================

app.get(
    "/templates",
    verifyKey,
    (req, res) => {

        try {

            const files =
                fs.readdirSync(
                    TEMPLATE_FOLDER
                );

            const templates = [];

            for (const file of files) {

                if (
                    !file.endsWith(".json")
                ) continue;

                try {

                    const template =
                        JSON.parse(
                            fs.readFileSync(
                                path.join(
                                    TEMPLATE_FOLDER,
                                    file
                                ),
                                "utf8"
                            )
                        );

                    templates.push({

                        id: file.replace(
                            ".json",
                            ""
                        ),

                        name:
                            template.name ||
                            file

                    });

                } catch {}

            }

            res.json({

                success: true,

                templates

            });

        } catch (err) {

            res.json({

                success: false,

                error:
                    "failed_to_load_templates"

            });

        }

    }
);

// ========================================
// HEALTH CHECK
// ========================================

app.get("/", (req, res) => {

    res.send(
        "🚀 ScriptForge Backend Running"
    );

});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log(
        `🚀 ScriptForge running on port ${PORT}`
    );

});
