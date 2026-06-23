require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const { Client, GatewayIntentBits } = require("discord.js");

// =========================
// 🧠 DATABASE
// =========================

const db = new sqlite3.Database("./scriptforge.db");

// USERS (plugin access system)
db.run(`
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    code TEXT,
    expiresAt INTEGER,
    uses INTEGER DEFAULT 0,
    maxUses INTEGER DEFAULT 10
)
`);

// RAFFLES
db.run(`
CREATE TABLE IF NOT EXISTS raffles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    active INTEGER,
    locked INTEGER,
    entries TEXT,
    endTime INTEGER
)
`);

// =========================
// 🌐 EXPRESS APP
// =========================

const app = express();
app.use(express.json());

// =========================
// 🔐 API KEY CHECK
// =========================

function verifyKey(req, res, next) {
    const key = req.headers["x-api-key"];
    if (key !== process.env.API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 🧠 SIMPLE RATE LIMIT (NO DEPENDENCIES)
// =========================

const requests = {};

function rateLimit(ip) {
    const now = Date.now();
    if (!requests[ip]) requests[ip] = [];

    requests[ip] = requests[ip].filter(t => now - t < 60000);

    if (requests[ip].length >= 40) return false;

    requests[ip].push(now);
    return true;
}

app.use((req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (!rateLimit(ip)) {
        return res.status(429).json({ error: "Too many requests" });
    }

    next();
});

// =========================
// 🔐 VALIDATE ACCESS (PLUGIN LOGIN)
// =========================

app.post("/validate", verifyKey, (req, res) => {
    const { userId, code } = req.body;

    db.get(
        "SELECT * FROM users WHERE userId = ? AND code = ?",
        [userId, code],
        (err, row) => {
            if (!row) return res.json({ valid: false });

            if (Date.now() > row.expiresAt) {
                return res.json({ valid: false, reason: "expired" });
            }

            res.json({
                valid: true,
                usesLeft: row.maxUses - row.uses
            });
        }
    );
});

// =========================
// 🔌 USE TRACKER (10 LIMIT)
// =========================

app.post("/use", verifyKey, (req, res) => {
    const { userId } = req.body;

    db.get("SELECT * FROM users WHERE userId = ?", [userId], (err, row) => {
        if (!row) return res.json({ ok: false });

        if (row.uses >= row.maxUses) {
            return res.json({ ok: false, reason: "limit" });
        }

        db.run(
            "UPDATE users SET uses = uses + 1 WHERE userId = ?",
            [userId]
        );

        res.json({ ok: true });
    });
});

// =========================
// 🤖 AI GENERATION ENDPOINT (PLUGIN CORE)
// =========================

app.post("/generate", verifyKey, (req, res) => {
    const { prompt, mode } = req.body;

    // 🔥 THIS IS WHERE YOU CONNECT DEEPSEEK LATER
    let output;

    if (mode === "create") {
        output = `-- CREATED SCRIPT\n-- Prompt: ${prompt}\nprint("System generated script")`;
    } else {
        output = `-- EDITED SCRIPT\n-- Prompt: ${prompt}\nprint("System improved script")`;
    }

    res.json({ script: output });
});

// =========================
// 🔑 CODE GENERATOR
// =========================

function generateCode() {
    return crypto.randomBytes(6).toString("hex");
}

// =========================
// 🤖 DISCORD BOT
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =========================
// 🔐 ADMIN CHECK
// =========================

function isAdmin(id) {
    return id === process.env.ADMIN_ID;
}

// =========================
// 🎟️ RAFFLE SYSTEM
// =========================

function createRaffle(durationMs, cb) {
    db.run(
        "INSERT INTO raffles (active, locked, entries, endTime) VALUES (1,0,'[]',?)",
        [Date.now() + durationMs],
        function () {
            cb(this.lastID);
        }
    );
}

function getRaffle(id, cb) {
    db.get("SELECT * FROM raffles WHERE id = ?", [id], cb);
}

// =========================
// 🎟️ ENTER RAFFLE
// =========================

function addEntry(raffle, userId, cb) {
    let entries = JSON.parse(raffle.entries);

    if (raffle.locked) return cb(false);
    if (entries.includes(userId)) return cb(false);

    entries.push(userId);

    db.run(
        "UPDATE raffles SET entries = ? WHERE id = ?",
        [JSON.stringify(entries), raffle.id],
        () => cb(true)
    );
}

// =========================
// 💬 DISCORD COMMANDS
// =========================

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // =========================
    // ENTER RAFFLE
    // =========================

    if (cmd === "!enterraffle") {
        db.get("SELECT * FROM raffles WHERE active = 1 ORDER BY id DESC LIMIT 1", [], (err, raffle) => {
            if (!raffle || raffle.locked) return message.reply("❌ No active raffle.");

            addEntry(raffle, message.author.id, (ok) => {
                if (!ok) return message.reply("⚠️ Already entered.");
                message.reply("✅ Entered raffle!");
            });
        });
    }

    // =========================
    // START RAFFLE
    // =========================

    if (cmd === "!raffle" && args[0] === "start") {
        if (!isAdmin(message.author.id)) return;

        const minutes = parseInt(args[1]) || 60;

        createRaffle(minutes * 60000, (raffleId) => {
            message.channel.send(`🎟️ Raffle started (#${raffleId})`);

            setTimeout(() => {
                getRaffle(raffleId, (err, raffle) => {
                    if (!raffle) return;

                    let entries = JSON.parse(raffle.entries);

                    if (entries.length === 0) {
                        return message.channel.send("❌ No entries.");
                    }

                    const winner = entries[Math.floor(Math.random() * entries.length)];

                    message.channel.send(`🎉 Winner: <@${winner}>`);

                    const code = generateCode();

                    db.run(
                        `INSERT OR REPLACE INTO users (userId, code, expiresAt, uses, maxUses)
                         VALUES (?, ?, ?, 0, 10)`,
                        [
                            winner,
                            code,
                            Date.now() + 24 * 60 * 60 * 1000
                        ]
                    );

                    client.users.fetch(winner).then(user => {
                        user.send(`
🎉 YOU WON SCRIPTFORGE ACCESS 🎉

🔑 Code: ${code}
⏳ 24 hours access
⚙️ 10 uses max

⚠️ Alpha system — bugs expected
                        `);
                    });
                });
            }, minutes * 60000);
        });
    }

    // =========================
    // HELP
    // =========================

    if (cmd === "!help") {
        return message.reply(
            isAdmin(message.author.id)
                ? "👑 !raffle start <mins>"
                : "📜 !enterraffle"
        );
    }
});

// =========================
// START SERVER + BOT
// =========================

app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Backend running");
});

client.login(process.env.BOT_TOKEN);
