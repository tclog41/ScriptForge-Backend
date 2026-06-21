require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();

// IMPORTANT FIX (this was your 500 error cause)
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================= DATABASE =================
const DATA_FILE = "./data.json";

function loadDB() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (err) {
        console.error("DB LOAD ERROR:", err);
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

    try {

        const db = loadDB();

        const discordId = req.body?.discordId;
        const code = req.body?.code;

        if (!discordId || !code) {
            return res.status(400).json({
                success: false,
                error: "missing data"
            });
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

    } catch (err) {

        console.error("CREATE LINK ERROR:", err);

        return res.status(500).json({
            success: false
        });
    }
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

// ================= CHECK =================
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

// ================= AI (SAFE PLACEHOLDER) =================
app.post("/ai", async (req, res) => {

    const db = loadDB();

    const { userId, prompt } = req.body;

    let user = db[userId];

    if (!user) {
        return res.json({ reply: "❌ Not linked" });
    }

    const COST = 2;

    if (user.tokens < COST) {
        return res.json({ reply: "❌ Not enough tokens" });
    }

    try {

        user.tokens -= COST;
        saveDB(db);

        return res.json({
            reply: "AI: " + prompt,
            tokensLeft: user.tokens
        });

    } catch (err) {

        console.error(err);

        return res.json({
            reply: "AI error"
        });
    }
});

// ================= START =================
app.listen(PORT, () => {
    console.log("ScriptForge running on port", PORT);
});
