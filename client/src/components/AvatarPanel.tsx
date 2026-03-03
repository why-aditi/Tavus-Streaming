import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

export interface AvatarPanelHandle {
  speak: (text: string) => void;
  startSession: () => void;
  endSession: () => void;
}

interface AvatarPanelProps {
  onSessionChange?: (active: boolean) => void;
}

const AvatarPanel = forwardRef<AvatarPanelHandle, AvatarPanelProps>(
  ({ onSessionChange }, ref) => {
    const callRef = useRef<DailyCall | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const cancelledRef = useRef(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [status, setStatus] = useState<
      "idle" | "connecting" | "connected" | "error"
    >("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const speak = useCallback(
      (text: string) => {
        if (!callRef.current || !conversationId) return;
        const interaction = {
          message_type: "conversation",
          event_type: "conversation.echo",
          conversation_id: conversationId,
          properties: { text },
        };
        callRef.current.sendAppMessage(interaction, "*");
      },
      [conversationId]
    );

    const endSession = useCallback(() => {
      cancelledRef.current = true;
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy();
        callRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (audioRef.current) audioRef.current.srcObject = null;
      setConversationId(null);
      setStatus("idle");
      setErrorMsg("");
      onSessionChange?.(false);
    }, [onSessionChange]);

    const startSession = useCallback(() => {
      if (status === "connecting") return;
      // Clean up any existing call (e.g. from a previous error)
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy();
        callRef.current = null;
      }
      setConversationId(null);
      setErrorMsg("");
      cancelledRef.current = false;
      setStatus("connecting");

      const init = async () => {
        try {
          const res = await fetch("/api/conversation", { method: "POST" });
          if (!res.ok) throw new Error(await res.text());
          const { conversation_url, conversation_id } = await res.json();
          if (cancelledRef.current) return;
          setConversationId(conversation_id);

          const call = DailyIframe.createCallObject({
            videoSource: false,
            audioSource: false,
            subscribeToTracksAutomatically: true,
          });
          callRef.current = call;

          const attachTracks = () => {
            const participants = call.participants();
            for (const [id, p] of Object.entries(participants)) {
              if (id === "local") continue;
              if (
                videoRef.current &&
                p.tracks.video?.state === "playable" &&
                p.tracks.video.persistentTrack
              ) {
                videoRef.current.srcObject = new MediaStream([
                  p.tracks.video.persistentTrack,
                ]);
              }
              if (
                audioRef.current &&
                p.tracks.audio?.state === "playable" &&
                p.tracks.audio.persistentTrack
              ) {
                audioRef.current.srcObject = new MediaStream([
                  p.tracks.audio.persistentTrack,
                ]);
              }
            }
          };

          call.on("participant-joined", attachTracks);
          call.on("participant-updated", attachTracks);
          call.on("track-started", attachTracks);

          call.on("joined-meeting", () => {
            if (!cancelledRef.current) {
              setStatus("connected");
              onSessionChange?.(true);
            }
          });

          call.on("error", (e) => {
            console.error("Daily error:", e);
            if (!cancelledRef.current) {
              setStatus("error");
              setErrorMsg(String((e as any)?.errorMsg ?? "Connection error"));
            }
          });

          await call.join({ url: conversation_url });
        } catch (err: any) {
          console.error("Init error:", err);
          if (!cancelledRef.current) {
            setStatus("error");
            setErrorMsg(err.message || "Failed to connect");
          }
        }
      };

      init();
    }, [status, onSessionChange]);

    useImperativeHandle(
      ref,
      () => ({ speak, startSession, endSession }),
      [speak, startSession, endSession]
    );

    useEffect(() => {
      return () => {
        cancelledRef.current = true;
        if (callRef.current) {
          callRef.current.leave().catch(() => {});
          callRef.current.destroy();
          callRef.current = null;
        }
      };
    }, []);

    return (
      <div className="flex flex-col h-full">
        {/* Video area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-zinc-950">
          {status === "idle" && (
            <div className="flex flex-col items-center gap-4 text-zinc-400">
              <p className="text-sm">Connect to the avatar to begin.</p>
              <button
                type="button"
                onClick={startSession}
                className="px-6 py-3 rounded-lg bg-violet-600 text-white font-semibold text-[0.95rem] cursor-pointer transition-colors hover:bg-violet-700"
              >
                Start session
              </button>
            </div>
          )}

          {status === "connecting" && (
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div
                className="h-8 w-8 rounded-full border-3 border-zinc-800 border-t-violet-400"
                style={{ animation: "spin 0.8s linear infinite" }}
              />
              <p>Connecting to avatar...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 text-red-400">
              <p>Connection failed</p>
              <p className="text-sm text-zinc-400 max-w-[280px] text-center">
                {errorMsg}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startSession}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold text-sm cursor-pointer hover:bg-violet-700"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={endSession}
                  className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 font-semibold text-sm cursor-pointer hover:bg-zinc-800"
                >
                  End session
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${status === "connected" ? "block" : "hidden"}`}
          />
          <audio ref={audioRef} autoPlay playsInline />
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 text-sm text-zinc-400 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                  : "bg-zinc-600"
              }`}
            />
            {status === "connected"
              ? "Avatar connected"
              : status === "connecting"
                ? "Connecting..."
                : status === "error"
                  ? "Disconnected"
                  : "Idle"}
          </div>
          {(status === "connected" || status === "connecting") && (
            <button
              type="button"
              onClick={endSession}
              className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 text-xs font-medium cursor-pointer hover:bg-zinc-800"
            >
              End session
            </button>
          )}
        </div>
      </div>
    );
  }
);

AvatarPanel.displayName = "AvatarPanel";

export default AvatarPanel;
