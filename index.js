require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TEMPLATE_FOLDER = path.join(__dirname, "templates");

// =========================
// ⚙️ CONFIG
// =========================

const PUBLIC_AUTH = "scriptforge_public_v1";

// in-memory cache (no database)
const cache = new Map();
const rateLimit = new Map();

// =========================
// 🧠 RATE LIMIT
// =========================

function isRateLimited(userId) {
    const now = Date.now();
    const data = rateLimit.get(userId);

    if (!data) {
        rateLimit.set(userId, { count: 1, time: now });
        return false;
    }

    if (now - data.time > 60000) {
        rateLimit.set(userId, { count: 1, time: now });
        return false;
    }

    data.count++;

    if (data.count > 10) return true;

    rateLimit.set(userId, data);
    return false;
}

// =========================
// 📦 LOAD TEMPLATE
// =========================

function loadTemplateFiles() {
    const files = fs.readdirSync(TEMPLATE_FOLDER);

    const templates = files
        .filter(f => f.endsWith(".json"))
        .map(f => {
            const raw = fs.readFileSync(path.join(TEMPLATE_FOLDER, f), "utf8");
            return JSON.parse(raw);
        });

    return templates;
}

// =========================
// 🔎 TEMPLATE MATCH
// =========================

function findTemplate(prompt) {
    const templates = loadTemplateFiles();

    for (const t of templates) {
        if (!t.keywords) continue;

        for (const k of t.keywords) {
            if (prompt.includes(k)) {
                return t;
            }
        }
    }

    return null;
}

// =========================
// 💾 CACHE
// =========================

function getCache(prompt) {
    return cache.get(prompt);
}

function saveCache(prompt, data) {
    cache.set(prompt, data);
}

// =========================
// 🤖 AI (DeepSeek)
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
                        content: "You are a Roblox Lua expert. Return ONLY clean Lua code."
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
// 🚀 MAIN GENERATE ROUTE
// =========================

app.post("/generate", async (req, res) => {
    try {
        const { prompt, userId, auth } = req.body;

        // =========================
        // 1. AUTH CHECK
        // =========================

        if (auth !== PUBLIC_AUTH) {
            return res.json({
                success: false,
                error: "invalid_auth"
            });
        }

        // =========================
        // 2. RATE LIMIT
        // =========================

        if (isRateLimited(userId)) {
            return res.json({
                success: false,
                error: "rate_limited"
            });
        }

        // =========================
        // 3. VALIDATION
        // =========================

        if (!prompt || prompt.length < 3) {
            return res.json({
                success: false,
                error: "invalid_prompt"
            });
        }

        const cleanPrompt = prompt.toLowerCase();

        // =========================
        // 4. TEMPLATE MATCH (FAST PATH)
        // =========================

        const template = findTemplate(cleanPrompt);

        if (template) {
            return res.json({
                success: true,
                source: "template",
                files: template.files
            });
        }

        // =========================
        // 5. CACHE
        // =========================

        const cached = getCache(cleanPrompt);

        if (cached) {
            return res.json({
                success: true,
                source: "cache",
                files: cached.files
            });
        }

        // =========================
        // 6. AI FALLBACK
        // =========================

        const ai = await callAI(prompt);

        const response = {
            success: true,
            source: "ai",
            files: [
                {
                    name: "AI_Script",
                    type: "LocalScript",
                    parent: "StarterPlayerScripts",
                    source: ai
                }
            ]
        };

        saveCache(cleanPrompt, response);

        return res.json(response);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            error: "server_error"
        });
    }
});

// =========================
// 📋 TEMPLATE LIST
// =========================

app.get("/templates", (req, res) => {
    try {
        const templates = loadTemplateFiles().map(t => ({
            name: t.name,
            keywords: t.keywords
        }));

        res.json({ success: true, templates });

    } catch (err) {
        res.json({ success: false, error: "failed" });
    }
});

// =========================
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log("🚀 ScriptForge Secure Backend running on port", PORT);
});
