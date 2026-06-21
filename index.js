require("dotenv").config();

const express = require("express");
const fs = require("fs");

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

// ================= LINK ROBLOX =================
app.get("/link/:robloxId/:code", (req, res) => {
    const { robloxId, code } = req.params;

    for (const discordId in db) {
        if (db[discordId].linkCode === code) {

            db[discordId].robloxId = robloxId;
            db[discordId].linkCode = null;

            saveDB();

            return res.json({ success: true });
        }
    }

    res.json({ success: false });
});

// ================= CHECK TOKENS =================
app.get("/check/:robloxId", (req, res) => {
    const id = req.params.robloxId;

    for (const discordId in db) {
        if (db[discordId].robloxId == id) {

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

// ================= USE AI (DEDUCT TOKENS) =================
app.post("/use-ai", async (req, res) => {
    const { robloxId, prompt } = req.body;

    let user = null;
    let discordId = null;

    for (const id in db) {
        if (db[id].robloxId == robloxId) {
            user = db[id];
            discordId = id;
        }
    }

    if (!user) {
        return res.json({ error: "Not linked" });
    }

    if (user.tokens < 1) {
        return res.json({ error: "No tokens" });
    }

    // deduct token
    user.tokens -= 1;
    saveDB();

    // simple AI response (replace with DeepSeek if needed)
    const response =
        "ScriptForge AI:\n\nPrompt: " +
        prompt +
        "\n\n(Replace this with DeepSeek API later)";

    res.json({
        reply: response,
        tokensLeft: user.tokens
    });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("ScriptForge API running on", PORT);
});
