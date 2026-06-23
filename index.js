require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =========================
// 🧠 DATABASE
// =========================

const db = new sqlite3.Database("./scriptforge.db");

// USERS
db.run(`
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    code TEXT,
    expiresAt INTEGER,
    uses INTEGER DEFAULT 0,
    maxUses INTEGER DEFAULT 10
)
`);

// TEMPLATES (NEW IN v11)
db.run(`
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    prompt TEXT
)
`);

// =========================
// 🔐 AUTH MIDDLEWARE
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

function verifyAdmin(req, res, next) {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
        return res.status(401).json({ success: false, error: "Admin only" });
    }
    next();
}

// =========================
// 🔐 ACCESS CHECK
// =========================

function checkAccess(userId) {
    return new Promise((resolve) => {
        db.get("SELECT * FROM users WHERE userId = ?", [userId], (err, row) => {
            if (!row) return resolve({ ok: false });

            if (Date.now() > row.expiresAt) {
                return resolve({ ok: false, reason: "expired" });
            }

            if (row.uses >= row.maxUses) {
                return resolve({ ok: false, reason: "limit" });
            }

            resolve({ ok: true, row });
        });
    });
}

// =========================
// 🤖 AI ENGINE
// =========================

async function callAI(prompt) {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "You are a Roblox Lua expert. Output ONLY clean code."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "-- AI ERROR";
}

// =========================
// 🧠 LOAD TEMPLATE (DB-BASED)
// =========================

function getTemplate(id) {
    return new Promise((resolve) => {
        db.get("SELECT * FROM templates WHERE id = ?", [id], (err, row) => {
            resolve(row);
        });
    });
}

// =========================
// 🚀 GENERATE (MAIN ENDPOINT)
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const {
        userId,
        mode,
        template,
        prompt,
        existingScript
    } = req.body;

    const access = await checkAccess(userId);

    if (!access.ok) {
        return res.json({
            success: false,
            error: access.reason || "no_access"
        });
    }

    // usage tracking
    db.run("UPDATE users SET uses = uses + 1 WHERE userId = ?", [userId]);

    let templateData = null;

    if (mode === "edit") {
        templateData = {
            prompt: `
You are editing a Roblox script.

Rules:
- Only modify what is needed
- Keep structure clean
- Return full updated script

EXISTING SCRIPT:
${existingScript}

USER REQUEST:
${prompt}
`
        };
    } else {
        templateData = await getTemplate(template);

        if (!templateData) {
            return res.json({
                success: false,
                error: "template_not_found"
            });
        }

        templateData.prompt = `
${templateData.prompt}

USER REQUEST:
${prompt}
`;
    }

    const script = await callAI(templateData.prompt);

    res.json({
        success: true,
        script,
        usesLeft: access.row.maxUses - access.row.uses - 1
    });
});

// =========================
// 📋 LIST TEMPLATES (NEW)
// =========================

app.get("/templates", verifyKey, (req, res) => {
    db.all("SELECT id, name FROM templates", [], (err, rows) => {
        res.json({
            success: true,
            templates: rows
        });
    });
});

// =========================
// 🧠 ADD TEMPLATE (ADMIN ONLY)
// =========================

app.post("/admin/template/add", verifyAdmin, (req, res) => {
    const { id, name, prompt } = req.body;

    db.run(
        "INSERT OR REPLACE INTO templates (id, name, prompt) VALUES (?, ?, ?)",
        [id, name, prompt]
    );

    res.json({ success: true });
});

// =========================
// ❌ DELETE TEMPLATE
// =========================

app.post("/admin/template/delete", verifyAdmin, (req, res) => {
    const { id } = req.body;

    db.run("DELETE FROM templates WHERE id = ?", [id]);

    res.json({ success: true });
});

// =========================
// 🔐 VALIDATE CODE
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
// 🚀 START
// =========================

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge v11 running on ${PORT}`);
});
