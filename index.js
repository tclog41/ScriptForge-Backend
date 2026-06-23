require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// =========================
// 🧠 DATABASE
// =========================

const db = new sqlite3.Database("./scriptforge.db");

db.run(`
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    code TEXT,
    expiresAt INTEGER,
    uses INTEGER DEFAULT 0,
    maxUses INTEGER DEFAULT 10
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS memory (
    userId TEXT PRIMARY KEY,
    context TEXT
)
`);

// =========================
// 🔐 VERIFY API KEY
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 🧠 SIMPLE INTENT DETECTOR
// =========================

function detectIntent(prompt) {
    const p = prompt.toLowerCase();

    if (p.includes("improve") || p.includes("fix") || p.includes("optimize")) {
        return "edit";
    }

    if (p.includes("sprint") || p.includes("combat") || p.includes("ui") || p.includes("inventory")) {
        return "template";
    }

    return "ai";
}

// =========================
// 🧠 TEMPLATE ENGINE
// =========================

const templates = {
    sprint: `-- Sprint System
local speed = 24
game.Players.LocalPlayer.Character.Humanoid.WalkSpeed = speed`,

    combat: `-- Combat System
print("Combat ready")`,

    ui: `-- UI System
local gui = Instance.new("ScreenGui")
gui.Parent = game.Players.LocalPlayer.PlayerGui`,

    inventory: `-- Inventory System
local inv = {}
print("Inventory ready")`
};

// =========================
// 🤖 AI CALL (DEEPSEEK READY)
// =========================

async function callAI(prompt, context = "", mode = "create") {
    // ⚠️ placeholder endpoint (swap with real DeepSeek later)
    // You can replace this with OpenAI or DeepSeek API

    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_KEY || ""}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are a Roblox Lua expert." },
                { role: "user", content: context + "\n\n" + prompt }
            ]
        })
    }).catch(() => null);

    if (!response) {
        return `-- AI OFFLINE FALLBACK\nprint("No AI available")`;
    }

    const data = await response.json();

    return data?.choices?.[0]?.message?.content || "-- AI FAILED";
}

// =========================
// 🔌 GENERATE ENDPOINT (v5 CORE)
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const { userId, prompt } = req.body;

    const intent = detectIntent(prompt);

    // =========================
    // 🧠 TEMPLATE FIRST
    // =========================

    if (intent === "template") {
        const key = Object.keys(templates).find(t =>
            prompt.toLowerCase().includes(t)
        );

        if (key) {
            return res.json({
                script: templates[key],
                source: "template"
            });
        }
    }

    // =========================
    // 🧠 MEMORY LOAD
    // =========================

    let context = "";

    db.get("SELECT context FROM memory WHERE userId = ?", [userId], (err, row) => {
        if (row) context = row.context || "";
    });

    // =========================
    // 🤖 AI / EDIT MODE
    // =========================

    let mode = intent === "edit" ? "edit" : "create";

    const ai = await callAI(prompt, context, mode);

    // Save memory (simple overwrite)
    db.run(
        "INSERT OR REPLACE INTO memory (userId, context) VALUES (?, ?)",
        [userId, prompt]
    );

    res.json({
        script: ai,
        source: "ai",
        mode
    });
});

// =========================
// 🔐 VALIDATE
// =========================

app.post("/validate", verifyKey, (req, res) => {
    const { userId, code } = req.body;

    db.get(
        "SELECT * FROM users WHERE userId = ? AND code = ?",
        [userId, code],
        (err, row) => {
            if (!row) return res.json({ valid: false });

            if (Date.now() > row.expiresAt) {
                return res.json({ valid: false });
            }

            res.json({
                valid: true,
                usesLeft: row.maxUses - row.uses
            });
        }
    );
});

// =========================
// 🔌 USE TRACKING
// =========================

app.post("/use", verifyKey, (req, res) => {
    const { userId } = req.body;

    db.get("SELECT * FROM users WHERE userId = ?", [userId], (err, row) => {
        if (!row || row.uses >= row.maxUses) {
            return res.json({ ok: false });
        }

        db.run("UPDATE users SET uses = uses + 1 WHERE userId = ?", [userId]);

        res.json({ ok: true });
    });
});

// =========================
// 🤖 DISCORD BOT (same service)
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

function isAdmin(id) {
    return id === process.env.ADMIN_ID;
}

function generateCode() {
    return crypto.randomBytes(6).toString("hex");
}

// =========================
// 🎟️ RAFFLE (simple v5 version)
// =========================

let entries = [];

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    const args = msg.content.split(" ");
    const cmd = args[0];

    if (cmd === "!enterraffle") {
        if (!entries.includes(msg.author.id)) {
            entries.push(msg.author.id);
            msg.reply("✅ Entered raffle");
        }
    }

    if (cmd === "!raffle") {
        if (!isAdmin(msg.author.id)) return;

        const winner = entries[Math.floor(Math.random() * entries.length)];

        const code = generateCode();

        db.run(
            "INSERT OR REPLACE INTO users VALUES (?,?,?,?,?)",
            [winner, code, Date.now() + 86400000, 0, 10]
        );

        msg.channel.send(`🎉 Winner: <@${winner}>`);

        client.users.fetch(winner).then(u => {
            u.send(`🎉 You won access!\nCode: ${code}\n10 uses / 24h`);
        });

        entries = [];
    }
});

// =========================
// START
// =========================

app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 ScriptForge v5 running");
});

client.login(process.env.BOT_TOKEN);
