# Tavus Streaming Chat POC

A proof-of-concept chat application where you type messages, an LLM (Groq Llama 3.1 8B) generates streaming replies, and a Tavus CVI avatar speaks those replies in real time.

## Prerequisites

- **Node.js** 18+
- A **Tavus** API key ([platform.tavus.io](https://platform.tavus.io))
- A **Groq** API key ([console.groq.com](https://console.groq.com))

## Setup

1. **Install dependencies:**

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

2. **Configure environment variables:**

Create a `.env` file inside the `server/` directory:

```
GROQ_API_KEY=your_groq_api_key_here
TAVUS_API_KEY=your_tavus_api_key_here
```

You can optionally override the default Tavus stock replica and persona:

```
TAVUS_REPLICA_ID=rf4e9d9790f0
TAVUS_PERSONA_ID=pcb7a34da5fe
```

3. **Start the application:**

Open two terminals:

```bash
# Terminal 1 — backend (port 3001)
cd server
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## How It Works

1. On page load, the frontend creates a Tavus CVI conversation via the backend.
2. The Daily.js SDK connects to the conversation and renders the avatar video on the left panel.
3. You type messages in the chat panel on the right.
4. Each message is sent to the Express backend, which streams the response from the Groq API (Llama 3.1 8B Instant) back to the frontend via SSE.
5. Tokens appear in the chat bubble in real time as they arrive.
6. Once the full response is received, it is sent to the avatar via a Daily Echo interaction, making the avatar speak the complete reply.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, Daily.js SDK
- **Backend:** Node.js, Express
- **LLM:** Groq API (Llama 3.1 8B Instant) with streaming
- **Avatar:** Tavus CVI (Conversational Video Interface) with Echo interactions

## Project Structure

```
├── server/                Express backend
│   ├── index.js           API endpoints (/api/conversation, /api/chat)
│   ├── .env               API keys (not committed)
│   └── package.json
├── client/                React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.tsx        Split layout (avatar left, chat right)
│   │   ├── App.css        Tailwind entry point
│   │   ├── main.tsx       React entry point
│   │   └── components/
│   │       ├── AvatarPanel.tsx  Daily SDK video + Echo interactions
│   │       └── ChatPanel.tsx    Streaming chat UI
│   ├── vite.config.ts     Tailwind plugin + API proxy to backend
│   └── package.json
├── .gitignore
└── README.md
```
