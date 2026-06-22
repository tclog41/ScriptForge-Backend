require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ================= DB =================
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

// ================= AI TEMPLATE ENGINE =================

app.post("/ai", async (req, res) => {

    try {

        const db = loadDB();

        const userId = String(req.body?.userId || "");
        const prompt = String(req.body?.prompt || "");
        const template = String(req.body?.template || "Basic");

        if (!userId || !prompt) {
            return res.json({ success: false, reply: "Missing data" });
        }

        ensureUser(db, userId);

        if (db[userId].tokens <= 0) {
            return res.json({ success: false, reply: "No tokens" });
        }

        db[userId].tokens -= 1;
        saveDB(db);

        // ================= SYSTEM PROMPT =================

        const systemPrompt = `
You are ScriptForge AI Template Engine V2.

You ONLY modify templates.

RULES:
- Return ONLY JSON
- No explanations
- Only modify allowed fields
- Keep structure valid

Template Type:
${template}

OUTPUT FORMAT:
{
  "edit": {
    "field": "value"
  }
}
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

        console.log("AI RESPONSE:", JSON.stringify(data, null, 2));

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

        console.log(err);

        return res.json({
            success: false,
            reply: "Server error"
        });
    }
});

app.listen(PORT, () => {
    console.log("ScriptForge V2 running on", PORT);
});
