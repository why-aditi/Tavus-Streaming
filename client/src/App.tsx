import { useRef, useCallback } from "react";
import AvatarPanel, {
  type AvatarPanelHandle,
} from "./components/AvatarPanel";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const avatarRef = useRef<AvatarPanelHandle>(null);

  const handleReply = useCallback((text: string) => {
    avatarRef.current?.speak(text);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-200 font-sans">
      <div className="flex flex-1 flex-col border-r border-zinc-800 bg-zinc-900 md:basis-1/2">
        <AvatarPanel ref={avatarRef} />
      </div>
      <div className="flex flex-1 flex-col bg-zinc-950 md:basis-1/2">
        <ChatPanel onReply={handleReply} />
      </div>
    </div>
  );
}
