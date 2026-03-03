import { useState, useRef, useEffect, type FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onReply?: (text: string) => void;
  sessionActive?: boolean;
}

export default function ChatPanel({ onReply, sessionActive = true }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !sessionActive) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const { token } = JSON.parse(payload);
            if (token) {
              full += token;
              setStreamingText(full);
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: full },
      ]);
      setStreamingText("");
      onReply?.(full);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-100">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {messages.length === 0 && !streamingText && !sessionActive && (
          <div className="m-auto text-center text-zinc-500">
            <p>Start a session to begin chatting.</p>
          </div>
        )}
        {messages.length === 0 && !streamingText && sessionActive && (
          <div className="m-auto text-center text-zinc-500">
            <p>Type a message to start the conversation.</p>
            <p className="text-sm mt-1 text-zinc-600">
              The avatar will speak the AI's replies.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] ${msg.role === "user" ? "self-end" : "self-start"}`}
          >
            <div
              className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                msg.role === "user"
                  ? "text-violet-400 text-right"
                  : "text-sky-400"
              }`}
            >
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div
              className={`px-3.5 py-2.5 rounded-xl text-[0.95rem] leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="max-w-[85%] self-start">
            <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-sky-400">
              AI
            </div>
            <div className="px-3.5 py-2.5 rounded-xl text-[0.95rem] leading-relaxed bg-zinc-800 text-zinc-200 rounded-bl-sm">
              {streamingText}
              <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-violet-400 animate-pulse" />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="max-w-[85%] self-start">
            <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-sky-400">
              AI
            </div>
            <div className="flex gap-1 px-4 py-3 bg-zinc-800 rounded-xl rounded-bl-sm">
              <span
                className="w-2 h-2 rounded-full bg-zinc-500"
                style={{ animation: "blink 1.4s infinite both" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-zinc-500"
                style={{
                  animation: "blink 1.4s infinite both",
                  animationDelay: "0.2s",
                }}
              />
              <span
                className="w-2 h-2 rounded-full bg-zinc-500"
                style={{
                  animation: "blink 1.4s infinite both",
                  animationDelay: "0.4s",
                }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        className="flex gap-2 px-5 py-4 border-t border-zinc-800"
        onSubmit={handleSend}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading || !sessionActive}
          autoFocus
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 text-[0.95rem] outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !sessionActive}
          className="px-5 py-2.5 rounded-lg bg-violet-600 text-white font-semibold text-[0.95rem] cursor-pointer transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
