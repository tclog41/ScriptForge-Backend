require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("ScriptForge API Online ✅");
});

// ================= CREATE LINK =================
app.post("/create-link", (req, res) => {

    const db = loadDB();

    const discordId = req.body?.discordId;
    const code = req.body?.code;

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

    const robloxId = String(req.params.robloxId);
    const code = String(req.params.code);

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

// ================= CHECK =================
app.get("/check/:robloxId", (req, res) => {

    const db = loadDB();

    const robloxId = String(req.params.robloxId);

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

// ================= AI (ROBUST FIXED) =================
app.post("/ai", (req, res) => {

    try {

        const db = loadDB();

        const userId = req.body?.userId;
        const prompt = req.body?.prompt;

        if (!userId || !prompt) {
            return res.json({ reply: "AI not connected" });
        }

        let user = db[userId];

        if (!user) {
            return res.json({ reply: "AI not connected" });
        }

        const COST = 2;

        if (user.tokens < COST) {
            return res.json({ reply: "❌ Not enough tokens" });
        }

        user.tokens -= COST;
        saveDB(db);

        return res.json({
            reply: "🧠 " + prompt,
            tokensLeft: user.tokens
        });

    } catch (err) {

        console.error("AI ERROR:", err);

        return res.json({
            reply: "AI not connected"
        });
    }
});

// ================= START =================
app.listen(PORT, () => {
    console.log("ScriptForge running on port", PORT);
});
