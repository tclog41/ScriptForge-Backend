require("dotenv").config();

const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================= FILE DB =================
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

// ================= LINK SYSTEM (FIXED) =================
app.get("/link/:robloxId/:code", (req, res) => {
    const db = loadDB(); // 🔥 ALWAYS FRESH

    const robloxId = String(req.params.robloxId).trim();
    const code = String(req.params.code).trim();

    for (const discordId in db) {

        const storedCode = String(db[discordId].linkCode || "").trim();

        if (storedCode === code) {

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

// ================= CHECK TOKENS =================
app.get("/check/:robloxId", (req, res) => {
    const db = loadDB(); // 🔥 ALWAYS FRESH

    const robloxId = String(req.params.robloxId).trim();

    for (const discordId in db) {
        if (db[discordId].robloxId == robloxId) {
            return res.json({
                access: true,
                tokens: db[discordId].tokens || 0
            });
        }
    }

    res.json({
        access: false,
        tokens: 0
    });
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log("ScriptForge running on port", PORT);
});
