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
// 🔐 AUTH MIDDLEWARE
// =========================

function verifyKey(req, res, next) {
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
}

// =========================
// 🧠 TEMPLATE SYSTEM (REAL CORE)
// =========================

const templates = {
    sprint: `
You are generating a Roblox Sprint System.

Requirements:
- Shift to sprint
- Stamina system
- Smooth camera FOV change
- Clean modular Lua code
- Optimized for performance
`,

    ui: `
You are generating a Roblox UI System.

Requirements:
- Modern UI design
- Tween animations
- Scalable UI layout
- Clean structure
- Easy to modify
`,

    combat: `
You are generating a Roblox Combat System.

Requirements:
- Hit detection
- Damage system
- Cooldowns
- Server-safe logic
- Anti-exploit considerations
`,

    movement: `
You are generating a Roblox Movement System.

Requirements:
- Sprint + slide + jump boost
- Smooth character movement
- No laggy physics abuse
- Clean modular design
`,

    edit: `
You are editing an existing Roblox script.

Rules:
- Do NOT rewrite everything unless needed
- Improve only requested parts
- Keep original structure where possible
- Return full updated script
`
};

// =========================
// 🔐 ACCESS CHECK
// =========================

function checkAccess(userId) {
    return new Promise((resolve) => {
        db.get(
            "SELECT * FROM users WHERE userId = ?",
            [userId],
            (err, row) => {
                if (!row) return resolve({ ok: false });

                if (Date.now() > row.expiresAt) {
                    return resolve({ ok: false, reason: "expired" });
                }

                if (row.uses >= row.maxUses) {
                    return resolve({ ok: false, reason: "limit" });
                }

                resolve({ ok: true, row });
            }
        );
    });
}

// =========================
// 🤖 AI CALL
// =========================

async function callAI(prompt) {
    try {
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
                        content: "You are a Roblox Lua expert. Output ONLY code."
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

    } catch (err) {
        return "-- SERVER ERROR";
    }
}

// =========================
// 🚀 GENERATE ENDPOINT (MAIN)
// =========================

app.post("/generate", verifyKey, async (req, res) => {
    const {
        userId,
        code,
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

    // increase usage
    db.run(
        "UPDATE users SET uses = uses + 1 WHERE userId = ?",
        [userId]
    );

    let finalPrompt = "";

    // =========================
    // 🎯 TEMPLATE MODE
    // =========================

    if (mode === "edit") {
        finalPrompt = `
${templates.edit}

EXISTING SCRIPT:
${existingScript}

USER REQUEST:
${prompt}
`;
    } else {
        const templatePrompt = templates[template] || templates.ui;

        finalPrompt = `
${templatePrompt}

USER REQUEST:
${prompt}
`;
    }

    const script = await callAI(finalPrompt);

    const updatedUses = access.row.uses + 1;

    res.json({
        success: true,
        script,
        usesLeft: access.row.maxUses - updatedUses
    });
});

// =========================
// 🔐 VALIDATE ENDPOINT
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
// 🔌 USE TRACKING (optional safety endpoint)
// =========================

app.post("/use", verifyKey, (req, res) => {
    const { userId } = req.body;

    db.get("SELECT * FROM users WHERE userId = ?", [userId], (err, row) => {
        if (!row) return res.json({ ok: false });

        if (row.uses >= row.maxUses) {
            return res.json({ ok: false });
        }

        db.run("UPDATE users SET uses = uses + 1 WHERE userId = ?", [userId]);

        res.json({ ok: true });
    });
});

// =========================
// 🚀 START SERVER
// =========================

app.listen(PORT, () => {
    console.log(`🚀 ScriptForge v10 Backend running on port ${PORT}`);
});
