import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID || "rf4e9d9790f0";
const TAVUS_PERSONA_ID = process.env.TAVUS_PERSONA_ID || "pcb7a34da5fe";

app.post("/api/conversation", async (req, res) => {
  try {
    const response = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TAVUS_API_KEY,
      },
      body: JSON.stringify({
        replica_id: TAVUS_REPLICA_ID,
        persona_id: TAVUS_PERSONA_ID,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Tavus API error:", response.status, err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json({
      conversation_url: data.conversation_url,
      conversation_id: data.conversation_id,
    });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

const SYSTEM_PROMPT = `You are a friendly and helpful AI assistant. Keep your responses concise and conversational — ideally 1-3 sentences — since they will be spoken aloud by a video avatar. Avoid markdown formatting, bullet points, or code blocks in your replies.`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: groqMessages,
          temperature: 0.7,
          max_tokens: 256,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", response.status, err);
      return res.status(response.status).json({ error: err });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch {}
      }
    }

    res.end();
  } catch (error) {
    console.error("Failed to get chat response:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get chat response" });
    } else {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
