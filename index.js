require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("ScriptForge backend is running");
});

// AI route
app.post("/ai", async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) {
    return res.json({
      error: "No prompt provided"
    });
  }

  try {
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt
          }
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
      reply: response.data.choices[0].message.content
    });

  } catch (err) {
    console.error("DeepSeek Error:", err.response?.data || err.message);

    res.status(500).json({
      error: "AI request failed",
      details: err.response?.data || err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ScriptForge backend running on port ${PORT}`);
});