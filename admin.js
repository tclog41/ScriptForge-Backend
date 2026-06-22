const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

// =========================
// 🔐 ADMIN KEY (IMPORTANT)
// =========================

const ADMIN_KEY = process.env.ADMIN_KEY;

// =========================
// 💾 LOAD USERS
// =========================

let activeUsers = new Set();

function loadUsers() {
    if (fs.existsSync("./users.json")) {
        const data = JSON.parse(fs.readFileSync("./users.json"));
        activeUsers = new Set(data);
    }
}

function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify([...activeUsers]));
}

loadUsers();

// =========================
// 🔐 ADMIN AUTH MIDDLEWARE
// =========================

function checkAdmin(req, res, next) {
    const key = req.body.key || req.headers["x-admin-key"];

    if (!key || key !== ADMIN_KEY) {
        return res.status(401).json({ error: "Not admin" });
    }

    next();
}

// =========================
// 📊 VIEW ALL USERS
// =========================

app.get("/users", checkAdmin, (req, res) => {
    res.json({
        total: activeUsers.size,
        users: [...activeUsers]
    });
});

// =========================
// ➕ ADD USER
// =========================

app.post("/add-user", checkAdmin, (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.json({ error: "Missing userId" });
    }

    activeUsers.add(userId);
    saveUsers();

    res.json({ success: true, message: "User added" });
});

// =========================
// ❌ REMOVE USER
// =========================

app.post("/remove-user", checkAdmin, (req, res) => {
    const { userId } = req.body;

    activeUsers.delete(userId);
    saveUsers();

    res.json({ success: true, message: "User removed" });
});

// =========================
// 🔁 RESET ALL USERS
// =========================

app.post("/reset", checkAdmin, (req, res) => {
    activeUsers.clear();
    saveUsers();

    res.json({ success: true, message: "All users cleared" });
});

// =========================
// 🚀 START SERVER
// =========================

const PORT = process.env.ADMIN_PORT || 4000;

app.listen(PORT, () => {
    console.log("Admin panel running on port", PORT);
});