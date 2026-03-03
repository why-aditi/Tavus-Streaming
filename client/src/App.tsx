import { useRef, useCallback, useState } from "react";
import AvatarPanel, {
  type AvatarPanelHandle,
} from "./components/AvatarPanel";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const avatarRef = useRef<AvatarPanelHandle>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const handleReply = useCallback((text: string) => {
    avatarRef.current?.speak(text);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-200 font-sans">
      <div className="flex flex-1 flex-col border-r border-zinc-800 bg-zinc-900 md:basis-1/2">
        <AvatarPanel ref={avatarRef} onSessionChange={setSessionActive} />
      </div>
      <div className="flex flex-1 flex-col bg-zinc-950 md:basis-1/2">
        <ChatPanel onReply={handleReply} sessionActive={sessionActive} />
      </div>
    </div>
  );
}
