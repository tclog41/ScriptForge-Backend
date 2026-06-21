require("dotenv").config();

const express = require("express");
const fs = require("fs");

// Node 18+ (Render supports fetch)
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("ScriptForge API Online ✅");
});

// ================= CREATE LINK =================
app.post("/create-link", (req, res) => {

    const db = loadDB();

    const { discordId, code } = req.body;

    if (!discordId || !code) {
        return res.json({ success: false });
    }

    if (!db[discordId]) {
        db[discordId] = {
            tokens: 0,
            robloxId: null,
            linkCode: null
        };
    }

    db[discordId].linkCode = String(code);

    saveDB(db);

    return res.json({ success: true });
});

// ================= LINK ROBLOX =================
app.get("/link/:robloxId/:code", (req, res) => {

    const db = loadDB();

    const robloxId = String(req.params.robloxId).trim();
    const code = String(req.params.code).trim();

    for (const id in db) {
        if (String(db[id].linkCode) === code) {

            db[id].robloxId = robloxId;
            db[id].linkCode = null;

            saveDB(db);

            return res.json({ success: true });
        }
    }

    return res.json({ success: false });
});

// ================= CHECK ACCOUNT =================
app.get("/check/:robloxId", (req, res) => {

    const db = loadDB();

    const robloxId = String(req.params.robloxId).trim();

    for (const id in db) {

        if (db[id].robloxId == robloxId) {
            return res.json({
                access: true,
                tokens: db[id].tokens || 0
            });
        }
    }

    return res.json({
        access: false,
        tokens: 0
    });
});

// ================= REAL AI (DEEPSEEK + TOKENS) =================
app.post("/ai", async (req, res) => {

    const db = loadDB();

    const { userId, prompt } = req.body;

    let user = db[userId];

    if (!user) {
        return res.json({ reply: "❌ Not linked" });
    }

    const COST = 2;

    if (user.tokens < COST) {
        return res.json({
            reply: "❌ Not enough tokens (Cost: 2)"
        });
    }

    try {

        const response = await fetch(
            "https://api.deepseek.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + process.env.DEEPSEEK_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "You are ScriptForge AI inside Roblox. Keep replies short, useful, and game-focused."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        const aiReply =
            data?.choices?.[0]?.message?.content ||
            "No response from AI";

        // deduct tokens AFTER success
        user.tokens -= COST;
        saveDB(db);

        return res.json({
            reply: aiReply,
            tokensLeft: user.tokens
        });

    } catch (err) {

        console.error("AI ERROR:", err);

        return res.json({
            reply: "❌ AI failed"
        });
    }
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log("ScriptForge running on port", PORT);
});
