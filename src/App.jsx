import { useEffect, useRef, useState } from "react";
import DrawPage from "./screens/DrawPage";
import TalkPage from "./screens/TalkPage";
import CursorSparkles from "./components/CursorSparkles";
import FallingDecor from "./components/FallingDecor";


export default function App() {
  const [page, setPage] = useState("draw");
  const [avatarImage, setAvatarImage] = useState(null);

  const bgmRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/audio/kids-tune.mp3");
    audio.loop = true;
    audio.volume = 0;
    bgmRef.current = audio;
  
    audio.play().catch(() => {});
  
    const unlock = async () => {
      try {
        if (audio.paused) {
          await audio.play();
        }
        audio.volume = 0.08;
      } catch {}
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      try {
        audio.pause();
      } catch {}
    };
  }, []);
  

  function playPop() {
    const p = popRef.current;
    if (!p) return;
    try {
      p.currentTime = 0;
      p.play();
    } catch {}
  }

  async function handleGoTalk(drawingBase64) {
    playPop();
    setAvatarImage(drawingBase64);
    setPage("talk");

    try {
      const res = await fetch("http://localhost:8000/transform-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: drawingBase64 }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.avatar_image_base64) setAvatarImage(data.avatar_image_base64);
    } catch {}
  }

  return (
    <>
    <FallingDecor />
      <CursorSparkles />
      {page === "draw" && <DrawPage onSpeak={handleGoTalk} onPop={playPop} />}
      {page === "talk" && <TalkPage avatarImage={avatarImage} onBack={() => setPage("draw")} onPop={playPop} />}
    </>
  );
}
