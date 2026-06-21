require("dotenv").config();

const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

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

function saveDB() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// ================= HELPERS =================
function ensureUser(id) {
    if (!db[id]) {
        db[id] = {
            tokens: 0,
            robloxId: null,
            linkCode: null
        };
    }
}

// ================= ROOT =================
app.get("/", (req, res) => {
    res.send("ScriptForge Backend Running ✅");
});

// ================= LINK ROBLOX =================
app.get("/link/:robloxId/:code", (req, res) => {
    const { robloxId, code } = req.params;

    for (const discordId in db) {
        if (db[discordId].linkCode === code) {

            db[discordId].robloxId = robloxId;
            db[discordId].linkCode = null;

            saveDB();

            return res.json({
                success: true
            });
        }
    }

    res.json({
        success: false
    });
});

// ================= CHECK TOKENS =================
app.get("/check/:robloxId", (req, res) => {
    const robloxId = req.params.robloxId;

    for (const discordId in db) {
        if (db[discordId].robloxId == robloxId) {

            return res.json({
                access: true,
                tokens: db[discordId].tokens
            });
        }
    }

    res.json({
        access: false,
        tokens: 0
    });
});

// ================= USE AI (DEEPSEEK + TOKENS) =================
app.post("/use-ai", async (req, res) => {
    const { robloxId, prompt } = req.body;

    let user = null;

    for (const id in db) {
        if (db[id].robloxId == robloxId) {
            user = db[id];
        }
    }

    if (!user) {
        return res.json({
            error: "Account not linked"
        });
    }

    if (user.tokens < 1) {
        return res.json({
            error: "No tokens"
        });
    }

    // deduct token first
    user.tokens -= 1;
    saveDB();

    try {
        const response = await axios.post(
            "https://api.deepseek.com/chat/completions",
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are ScriptForge AI, a Roblox Lua scripting assistant. Always output clean, working Roblox scripts."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const aiReply = response.data.choices[0].message.content;

        return res.json({
            reply: aiReply,
            tokensLeft: user.tokens
        });

    } catch (err) {
        console.log("DeepSeek Error:", err.response?.data || err.message);

        return res.json({
            error: "AI request failed"
        });
    }
});

// ================= ADD TOKENS (OPTIONAL ADMIN TOOL) =================
app.post("/add-tokens", (req, res) => {
    const { robloxId, amount } = req.body;

    for (const id in db) {
        if (db[id].robloxId == robloxId) {
            db[id].tokens += amount;
            saveDB();

            return res.json({
                success: true,
                newBalance: db[id].tokens
            });
        }
    }

    res.json({
        success: false
    });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("ScriptForge Backend running on port", PORT);
});
