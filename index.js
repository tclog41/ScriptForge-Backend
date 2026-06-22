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


// ================= CREATE LINK =================
app.post("/create-link", (req, res) => {
    try {
        const db = loadDB();

        const discordId = String(req.body?.discordId || "");
        const code = String(req.body?.code || "");

        if (!discordId || !code) {
            return res.json({ success: false });
        }

        ensureUser(db, discordId);

        db[discordId].linkCode = code;

        saveDB(db);

        return res.json({ success: true });

    } catch (err) {
        console.log("CREATE LINK ERROR:", err);
        return res.json({ success: false });
    }
});


// ================= LINK VERIFY =================
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


// ================= AI (FIXED + REAL) =================
app.post("/ai", async (req, res) => {

    try {

        const db = loadDB();

        const userId = String(req.body?.userId || "");
        const prompt = String(req.body?.prompt || "");

        if (!userId || !prompt) {
            return res.json({
                reply: "Missing userId or prompt",
                tokensLeft: 0,
                success: false
            });
        }

        // ALWAYS ensure user exists (fixes AI not connected bug)
        ensureUser(db, userId);

        if (db[userId].tokens <= 0) {
            return res.json({
                reply: "❌ No tokens left",
                tokensLeft: 0,
                success: false
            });
        }

        // remove token
        db[userId].tokens -= 1;
        saveDB(db);

        // ================= REAL AI CALL =================
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
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        const data = await response.json();

        const reply =
            data?.choices?.[0]?.message?.content ||
            "AI error: no response from model";

        return res.json({
            reply: reply,
            tokensLeft: db[userId].tokens,
            success: true
        });

    } catch (err) {

        console.log("AI ERROR:", err);

        return res.json({
            reply: "AI not connected (backend error)",
            tokensLeft: 0,
            success: false
        });
    }
});


// ================= START =================
app.listen(PORT, () => {
    console.log("ScriptForge API running on port", PORT);
});
