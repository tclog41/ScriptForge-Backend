require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ================= DATABASE =================
const DATA_FILE = "./data.json";

function loadDB() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
        return {};
    }
}

function saveDB(db) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function ensureUser(db, id) {
    if (!db[id]) {
        db[id] = { tokens: 10 };
    }
}

// ================= AI ENDPOINT =================

app.post("/ai", async (req, res) => {

    try {

        const db = loadDB();

        const userId = String(req.body?.userId || "");
        const prompt = String(req.body?.prompt || "");
        const template = String(req.body?.template || "Basic Obby");

        const project = req.body?.project || {};
        const history = req.body?.history || [];

        if (!userId || !prompt) {
            return res.json({ success: false, reply: "Missing data" });
        }

        ensureUser(db, userId);

        if (db[userId].tokens <= 0) {
            return res.json({ success: false, reply: "No tokens left" });
        }

        db[userId].tokens -= 1;
        saveDB(db);

        // ================= MEMORY PACK =================

        const memory = {
            template,
            project,
            history: history.slice(-5)
        };

        // ================= SYSTEM PROMPT =================

        const systemPrompt = `
You are ScriptForge AI V2.

You are a Roblox development assistant.

RULES:
- Use memory to understand context
- Only respond with useful code or edits
- Do NOT generate unnecessary full systems
- Keep responses clean and structured
- Be consistent

MEMORY:
${JSON.stringify(memory)}
`;

        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.AI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.json({
                success: false,
                reply: data?.error?.message || "API error"
            });
        }

        const reply = data?.choices?.[0]?.message?.content || "{}";

        return res.json({
            success: true,
            reply,
            tokensLeft: db[userId].tokens
        });

    } catch (err) {

        console.log("AI ERROR:", err);

        return res.json({
            success: false,
            reply: "Server error"
        });
    }
});

// ================= START SERVER =================

app.listen(PORT, () => {
    console.log("ScriptForge V2 running on port", PORT);
});
