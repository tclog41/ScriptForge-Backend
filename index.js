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
    } catch (err) {
        console.log("DB LOAD ERROR:", err);
        return {};
    }
}

function saveDB(db) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
        console.log("DB SAVE ERROR:", err);
    }
}

function ensureUser(db, id) {
    if (!db[id]) {
        db[id] = {
            tokens: 10,
            robloxId: null,
            linkCode: null
        };
    }
}

// ================= HOME =================
app.get("/", (req, res) => {
    res.json({ status: "ScriptForge API Online" });
});

// ================= LINK =================
app.get("/link/:robloxId/:code", (req, res) => {

    const db = loadDB();

    const robloxId = String(req.params.robloxId).trim();
    const code = String(req.params.code).trim();

    for (const discordId in db) {

        const stored = String(db[discordId].linkCode || "").trim();

        if (stored === code) {

            db[discordId].robloxId = robloxId;
            db[discordId].linkCode = null;

            saveDB(db);

            return res.json({
                success: true
            });
        }
    }

    return res.json({
        success: false
    });
});

// ================= CHECK =================
app.get("/check/:robloxId", (req, res) => {

    const db = loadDB();
    const robloxId = String(req.params.robloxId).trim();

    for (const id in db) {
        if (db[id].robloxId === robloxId) {
            return res.json({
                access: true,
                tokens: db[id].tokens
            });
        }
    }

    return res.json({
        access: false,
        tokens: 0
    });
});

// ================= AI (FIXED SAFE VERSION) =================
app.post("/ai", (req, res) => {

    try {

        const db = loadDB();

        const userId = String(req.body?.userId || "");
        const prompt = String(req.body?.prompt || "");

        if (!userId || !prompt) {
            return res.json({
                reply: "AI not connected",
                tokensLeft: 0
            });
        }

        let user = db[userId];

        if (!user) {
            return res.json({
                reply: "AI not connected",
                tokensLeft: 0
            });
        }

        if (user.tokens <= 0) {
            return res.json({
                reply: "❌ No tokens",
                tokensLeft: 0
            });
        }

        // token cost
        const COST = 1;
        user.tokens -= COST;

        saveDB(db);

        // SIMPLE AI RESPONSE (you can upgrade later to DeepSeek/OpenAI)
        const reply = "🧠 You said: " + prompt;

        return res.json({
            reply: reply,
            tokensLeft: user.tokens
        });

    } catch (err) {

        console.log("AI ERROR:", err);

        return res.json({
            reply: "AI not connected",
            tokensLeft: 0
        });
    }
});

// ================= START =================
app.listen(PORT, () => {
    console.log("ScriptForge API running on port", PORT);
});
