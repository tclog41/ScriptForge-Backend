require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// --------------------
// TOKEN STORAGE (TEMP)
// --------------------
const userTokens = {};

// --------------------
// TOKEN FUNCTIONS
// --------------------
function getTokens(userId) {
    if (!userTokens[userId]) userTokens[userId] = 0;
    return userTokens[userId];
}

function addTokens(userId, amount) {
    if (!userTokens[userId]) userTokens[userId] = 0;
    userTokens[userId] += amount;
}

function useToken(userId) {
    if (!userTokens[userId] || userTokens[userId] <= 0) return false;
    userTokens[userId] -= 1;
    return true;
}

// --------------------
// TEST ROUTE
// --------------------
app.get("/", (req, res) => {
    res.send("ScriptForge backend is running");
});

// --------------------
// GET TOKENS
// --------------------
app.get("/tokens/:userId", (req, res) => {
    const userId = req.params.userId;

    res.json({
        tokens: getTokens(userId)
    });
});

// --------------------
// BUY TOKENS SHOP
// --------------------
app.post("/buy", (req, res) => {
    const { userId, package } = req.body;

    let amount = 0;

    if (package === "small") amount = 100;
    if (package === "medium") amount = 500;
    if (package === "large") amount = 2000;

    addTokens(userId, amount);

    res.json({
        message: "Purchase successful",
        tokensAdded: amount,
        total: getTokens(userId)
    });
});

// --------------------
// AI ENDPOINT (USES TOKENS)
// --------------------
app.post("/ai", async (req, res) => {
    const { prompt, userId } = req.body;

    if (!prompt || !userId) {
        return res.json({ error: "Missing prompt or userId" });
    }

    // check tokens
    if (!useToken(userId)) {
        return res.json({ error: "No tokens left" });
    }

    try {
        const response = await axios.post(
            "https://api.deepseek.com/chat/completions",
            {
                model: "deepseek-chat",
                messages: [
                    { role: "user", content: prompt }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            reply: response.data.choices[0].message.content,
            tokensLeft: getTokens(userId)
        });

    } catch (err) {
        res.json({
            error: "AI failed",
            details: err.message
        });
    }
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
