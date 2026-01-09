import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let globalLoopRunning = false;

export default function TalkPage({ avatarImage, onBack }) {
  const sessionIdRef = useRef(null);
  const audioRef = useRef(null);
  const runRef = useRef({ cancelled: false });
  const videoRef = useRef(null);

  const [status, setStatus] = useState("starting");
  const [lastUser, setLastUser] = useState("");
  const [lastAI, setLastAI] = useState("");

  const [talkVideo, setTalkVideo] = useState(null);

  async function playVideoLoop() {
    const v = videoRef.current;
    if (!v) return;

    try {
      v.loop = true;
      v.muted = true;
      try {
        v.currentTime = 0;
      } catch {}
      await v.play();
    } catch (e) {
      console.warn("Video play blocked:", e);
    }
  }

  function stopVideo() {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.pause();
      v.currentTime = 0;
    } catch {}
  }

  useEffect(() => {
    if (!avatarImage) return;

    let cancelled = false;

    async function generateSessionVideo() {
      setStatus("making-video");
      setTalkVideo(null);
      stopVideo();

      const videoPrompt =
        "A single cute 3D cartoon character centered, facing camera. " +
        "The character talks continuously with clear mouth movement, blinking, and subtle head bobbing. " +
        "Simple clean WHITE background that fills the entire frame. " +
        "Stable camera, soft lighting. No subtitles, no text, no borders.";

      try {
        const res = await fetch(`${API}/talking-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: avatarImage,
            prompt: videoPrompt,
            seconds: 8,
          }),
        });

        if (!res.ok) {
          const t = await res.text();
          console.error("talking-video failed:", t);
          if (!cancelled) setStatus("video-failed");
          return;
        }

        const data = await res.json();

        if (!cancelled && data?.video_mp4_base64) {
          setTalkVideo("data:video/mp4;base64," + data.video_mp4_base64);
          setStatus("ready");
        } else {
          if (!cancelled) setStatus("video-failed");
        }
      } catch (e) {
        console.error("talking-video error:", e);
        if (!cancelled) setStatus("video-failed");
      }
    }

    generateSessionVideo();

    return () => {
      cancelled = true;
    };
  }, [avatarImage]);

  useEffect(() => {
    if (globalLoopRunning) return;
    if (!talkVideo) return;

    globalLoopRunning = true;
    runRef.current = { cancelled: false };
    conversationLoop(runRef.current);

    return () => {
      runRef.current.cancelled = true;
      globalLoopRunning = false;

      stopVideo();

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
        audioRef.current = null;
      }
    };
  }, [talkVideo]);

  async function conversationLoop(ctrl) {
    await speakAI("Hello! Talk to me.", ctrl);
    if (ctrl.cancelled) return;

    while (!ctrl.cancelled) {
      const userText = await listenOnce(ctrl);
      if (ctrl.cancelled) return;
      if (!userText) continue;

      setLastUser(userText);

      const aiText = await chat(userText, ctrl);
      if (ctrl.cancelled) return;
      if (!aiText) continue;

      setLastAI(aiText);

      await speakAI(aiText, ctrl);
      if (ctrl.cancelled) return;
    }
  }

  async function speakAI(text, ctrl) {
    if (ctrl?.cancelled) return;

    setStatus("speaking");

    const audioRes = await fetch(`${API}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (ctrl?.cancelled) return;

    if (!audioRes.ok) {
      console.error("speak failed:", await audioRes.text());
      return;
    }

    const audioData = await audioRes.json();
    const wavUrl = "data:audio/wav;base64," + audioData.audio_base64;

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }

    await playVideoLoop();

    await new Promise((resolve) => {
      const audio = new Audio(wavUrl);
      audioRef.current = audio;

      const cleanup = () => {
        stopVideo();
        audioRef.current = null;
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      audio.play().catch(() => cleanup());
    });

    if (ctrl?.cancelled) return;
    setStatus("ready");
  }

  async function listenOnce(ctrl) {
    if (ctrl?.cancelled) return "";

    setStatus("listening");
    stopVideo();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      return "";
    }

    if (ctrl?.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      return "";
    }

    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();
    await new Promise((r) => setTimeout(r, 2500));

    if (ctrl?.cancelled) {
      try {
        recorder.stop();
      } catch {}
      stream.getTracks().forEach((t) => t.stop());
      return "";
    }

    recorder.stop();

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
    });

    if (ctrl?.cancelled) return "";

    const form = new FormData();
    form.append("audio", blob, "speech.webm");

    const res = await fetch(`${API}/listen`, { method: "POST", body: form });
    if (!res.ok) return "";

    const data = await res.json();
    return (data.text || "").trim();
  }

  async function chat(text, ctrl) {
    if (ctrl?.cancelled) return "";

    setStatus("thinking");
    stopVideo();

    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, session_id: sessionIdRef.current }),
    });

    if (!res.ok) return "";

    const data = await res.json();
    sessionIdRef.current = data.session_id;
    return (data.reply_text || "").trim();
  }

  function handleBack() {
    runRef.current.cancelled = true;
    globalLoopRunning = false;

    stopVideo();

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }

    onBack();
  }

  return (
    <div className="kid-bg">
      <div className="kid-card">
        <span className="kid-pill">Talk Mode</span>
        <h1 className="kid-title">Talk to your character</h1>

        {status === "making-video" && (
          <div style={loadingWrap}>
            <div style={loadingTop}>
              <div className="spinner" />
              <div style={loadingTitle}>Character generating…</div>
              <div style={loadingSub}>Keep playing while we build your character!</div>
            </div>
            <MiniBreakout />
          </div>
        )}

        {status === "video-failed" && (
          <div style={{ fontWeight: 900, padding: 18, color: "crimson" }}>
            Video failed. Check backend console.
          </div>
        )}

        {talkVideo && status !== "making-video" && (
          <div style={videoBox}>
            <video
              ref={videoRef}
              src={talkVideo}
              style={videoStyle}
              autoPlay
              muted
              playsInline
              loop
            />
          </div>
        )}

        <p style={{ marginTop: 12, fontWeight: 900 }}>Status: {status}</p>

        {lastUser && (
          <p>
            <b>You:</b> {lastUser}
          </p>
        )}
        {lastAI && (
          <p>
            <b>AI:</b> {lastAI}
          </p>
        )}

        <button onClick={handleBack} style={backBtn}>
          Back
        </button>
      </div>
    </div>
  );
}

function MiniBreakout() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let raf = 0;

    const W = c.width;
    const H = c.height;

    let paddleX = W / 2;
    const paddleW = 140;
    const paddleH = 14;

    let ballX = W / 2;
    let ballY = H / 2;
    let vx = 3.0;
    let vy = 3.4;
    const r = 10;

    const bricks = [];
    const rows = 4;
    const cols = 10;
    const brickW = 66;
    const brickH = 18;
    const gap = 10;
    const startX = (W - (cols * brickW + (cols - 1) * gap)) / 2;
    const startY = 28;

    const palette = ["#ff4d6d", "#ff9f1c", "#ffd60a", "#06d6a0", "#4ea8de", "#7b2cbf"];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        bricks.push({
          x: startX + col * (brickW + gap),
          y: startY + row * (brickH + gap),
          w: brickW,
          h: brickH,
          alive: true,
          color: palette[(row + col) % palette.length],
        });
      }
    }

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    function step() {
      ballX += vx;
      ballY += vy;

      if (ballX - r < 0) {
        ballX = r;
        vx *= -1;
      }
      if (ballX + r > W) {
        ballX = W - r;
        vx *= -1;
      }
      if (ballY - r < 0) {
        ballY = r;
        vy *= -1;
      }

      const pTop = H - 26;
      const pLeft = paddleX - paddleW / 2;
      const pRight = paddleX + paddleW / 2;
      const pBot = pTop + paddleH;

      if (ballY + r >= pTop && ballY + r <= pBot && ballX >= pLeft && ballX <= pRight && vy > 0) {
        ballY = pTop - r;
        vy *= -1;
        const hit = (ballX - paddleX) / (paddleW / 2);
        vx = 4.2 * hit;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        const inside =
          ballX + r > b.x &&
          ballX - r < b.x + b.w &&
          ballY + r > b.y &&
          ballY - r < b.y + b.h;

        if (inside) {
          b.alive = false;
          vy *= -1;
          break;
        }
      }

      if (ballY - r > H) {
        ballX = W / 2;
        ballY = H / 2;
        vx = 3.0;
        vy = 3.4;
        for (const b of bricks) b.alive = true;
      }

      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = "rgba(15,23,42,0.03)";
      ctx.fillRect(0, 0, W, H);

      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(b.x, b.y, b.w, 5);
      }

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(pLeft, pTop, paddleW, paddleH);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(pLeft, pTop, paddleW, 4);

      ctx.beginPath();
      ctx.arc(ballX, ballY, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(ballX - 4, ballY - 4, 2, ballX, ballY, r + 10);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, "#00a3ff");
      grad.addColorStop(1, "#7c3aed");
      ctx.fillStyle = grad;
      ctx.fill();

      raf = requestAnimationFrame(step);
    }

    function onMove(e) {
      const rect = c.getBoundingClientRect();
      const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
      paddleX = clamp(x, paddleW / 2, W - paddleW / 2);
    }

    c.addEventListener("mousemove", onMove);
    c.addEventListener("touchmove", onMove, { passive: true });

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("mousemove", onMove);
      c.removeEventListener("touchmove", onMove);
    };
  }, []);

  return (
    <div style={gameWrap}>
      <div style={gameTitle}>Mini Game</div>
      <canvas ref={canvasRef} width={960} height={520} style={gameCanvas} />
      <div style={gameHint}>Move mouse or finger to catch the ball.</div>
    </div>
  );
}

const loadingWrap = {
  marginTop: 16,
  display: "grid",
  gap: 16,
  justifyItems: "center",
};

const loadingTop = {
  width: "100%",
  maxWidth: 980,
  padding: 18,
  borderRadius: 20,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "rgba(255,255,255,0.85)",
};

const loadingTitle = { fontWeight: 1000, fontSize: 18 };
const loadingSub = { marginTop: 6, color: "#475569", fontWeight: 700 };

const videoBox = {
  marginTop: 16,
  width: "100%",
  maxWidth: 980,
  aspectRatio: "16 / 9",
  borderRadius: 24,
  border: "1px solid rgba(15,23,42,0.12)",
  overflow: "hidden",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
};

const videoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#ffffff",
};

const backBtn = {
  marginTop: 10,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15,23,42,0.15)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const gameWrap = {
  width: "100%",
  maxWidth: 980,
  display: "grid",
  gap: 10,
  justifyItems: "center",
};

const gameTitle = { fontWeight: 900, color: "#0f172a" };

const gameCanvas = {
  width: "100%",
  height: "auto",
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.15)",
  background: "white",
};

const gameHint = { color: "#475569", fontWeight: 700, fontSize: 13 };
