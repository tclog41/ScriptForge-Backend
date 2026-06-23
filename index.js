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

db.run(`
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    code TEXT,
    expiresAt INTEGER,
    uses INTEGER DEFAULT 0,
    maxUses INTEGER DEFAULT 10
)
`);

// =========================
// 🔐 API SECURITY
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// =========================
// 🧠 ACCESS CHECK ENGINE
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
// 🤖 AI ENGINE (SAFE WRAPPER)
// =========================

async function callAI(prompt, mode = "create") {
    try {
        if (!process.env.DEEPSEEK_KEY) {
            return "-- AI OFFLINE\nprint('no key')";
        }

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
                        content: "You are a Roblox Lua scripting assistant. Output ONLY code."
                    },
                    {
                        role: "user",
                        content: `${mode.toUpperCase()} MODE:\n${prompt}`
                    }
                ]
            })
        });

        const data = await res.json();
        return data?.choices?.[0]?.message?.content || "-- AI FAILED";

    } catch (err) {
        return "-- AI ERROR (fallback mode)";
    }
}

// =========================
// ✏️ EDIT ENGINE
// =========================

function buildEditPrompt(oldScript, request) {
    return `
You are editing a Roblox script.

OLD SCRIPT:
${oldScript}

REQUEST:
${request}

Return ONLY the updated script.
`;
}

// =========================
// 🌐 GENERATE / EDIT ENDPOINT
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const { userId, prompt, mode, existingScript } = req.body;

    const access = await checkAccess(userId);

    if (!access.ok) {
        return res.json({
            success: false,
            error: access.reason || "no_access"
        });
    }

    // increase usage
    db.run("UPDATE users SET uses = uses + 1 WHERE userId = ?", [userId]);

    let result;

    // =========================
    // ✏️ EDIT MODE
    // =========================
    if (mode === "edit" && existingScript) {
        const editPrompt = buildEditPrompt(existingScript, prompt);
        result = await callAI(editPrompt, "edit");
    }

    // =========================
    // 🧠 CREATE MODE
    // =========================
    else {
        result = await callAI(prompt, "create");
    }

    const newUsesLeft = access.row
        ? access.row.maxUses - (access.row.uses + 1)
        : 0;

    res.json({
        success: true,
        script: result,
        mode,
        usesLeft: newUsesLeft
    });
});

// =========================
// 🔌 VALIDATION ENDPOINT
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
// 🔁 USE TRACKING (OPTIONAL HARD CHECK)
// =========================

app.post("/use", verifyKey, (req, res) => {
    const { userId } = req.body;

    db.get("SELECT * FROM users WHERE userId = ?", [userId], (err, row) => {
        if (!row) return res.json({ ok: false });

        if (row.uses >= row.maxUses) {
            return res.json({ ok: false, reason: "limit" });
        }

        db.run("UPDATE users SET uses = uses + 1 WHERE userId = ?", [userId]);

        res.json({ ok: true });
    });
});

// =========================
// 🚀 START SERVER
// =========================

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge v7 Backend running on port ${PORT}`);
});
