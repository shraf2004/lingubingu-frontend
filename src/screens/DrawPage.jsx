import { useRef, useState } from "react";

export default function DrawPage({ onSpeak, onPop }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  const [color, setColor] = useState("#ff004c");
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState("pen"); // pen | eraser

  const colors = [
    "#ff004c",
    "#ff7a00",
    "#ffd400",
    "#00d084",
    "#00a3ff",
    "#7c3aed",
    "#ff5bd1",
    "#111827",
  ];

  function ctx() {
    const c = canvasRef.current;
    if (!c) return null;
    const x = c.getContext("2d");
    x.lineCap = "round";
    x.lineJoin = "round";
    return x;
  }

  function ensureWhiteBg() {
    const c = canvasRef.current;
    const x = ctx();
    if (!c || !x) return;
    // fill once
    const p = x.getImageData(0, 0, 1, 1).data;
    if (p[3] === 0) {
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, c.width, c.height);
    }
  }

  function getPoint(e) {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches?.[0];
    const clientX = t ? t.clientX : e.clientX;
    const clientY = t ? t.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    ensureWhiteBg();
    const x = ctx();
    if (!x) return;
    const p = getPoint(e);
    x.beginPath();
    x.moveTo(p.x, p.y);
    setDrawing(true);
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const x = ctx();
    if (!x) return;
    const p = getPoint(e);
    x.strokeStyle = mode === "eraser" ? "#ffffff" : color;
    x.lineWidth = size;
    x.lineTo(p.x, p.y);
    x.stroke();
  }

  function stop(e) {
    e?.preventDefault?.();
    setDrawing(false);
  }

  function clear() {
    const c = canvasRef.current;
    const x = ctx();
    if (!c || !x) return;
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, c.width, c.height);
  }

  function speak() {
    const c = canvasRef.current;
    if (!c) return;
    ensureWhiteBg();
    const img = c.toDataURL("image/png");
    onSpeak(img);
  }

  return (
    <div className="kid-bg">
  <div className="kid-card">
    <span className="kid-pill">Draw Mode</span>
    <h1 className="kid-title">Draw your character</h1>
<p className="kid-sub">Pick colors, draw, then press Speak.</p>


        <div style={styles.tools}>
          <div style={styles.colorRow}>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onPop?.();
                  setMode("pen");
                  setColor(c);
                }}
                
                                
                style={{
                  ...styles.colorDot,
                  background: c,
                  outline: mode === "pen" && color === c ? "3px solid #0f172a" : "none",
                }}
              />
            ))}
          </div>

          <div style={styles.row}>
            <button
              style={{
                ...styles.toolBtn,
                background: mode === "pen" ? "#0f172a" : "white",
                color: mode === "pen" ? "white" : "#0f172a",
              }}
              onClick={() => setMode("pen")}
            >
              Pen
            </button>

            <button
              style={{
                ...styles.toolBtn,
                background: mode === "eraser" ? "#0f172a" : "white",
                color: mode === "eraser" ? "white" : "#0f172a",
              }}
              onClick={() => {
                onPop?.();
                setMode("eraser");
              }}
              
            >
              Eraser
            </button>

            <div style={styles.sizeBox}>
              <span style={{ fontWeight: 900 }}>Size</span>
              <input
                type="range"
                min="2"
                max="26"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span style={{ width: 28, textAlign: "right", fontWeight: 900 }}>{size}</span>
            </div>

            <button
  style={styles.clearBtn}
  onClick={() => {
    onPop?.();
    clear();
  }}
>
  Clear
</button>

          </div>
        </div>

        <div style={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={380}
            height={380}
            style={styles.canvas}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={stop}
          />
        </div>

        <button
  style={styles.speakBtn}
  onClick={() => {
    onPop?.();
    speak();
  }}
>
  SPEAK 🎤
</button>


        <p style={styles.tip}>Tip: big eyes + smile looks best.</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "linear-gradient(180deg, #dbeafe, #fce7f3, #fef9c3)",
  },
  card: {
    width: "100%",
    maxWidth: 860,
    background: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    textAlign: "center",
  },
  title: { margin: 0, color: "#0f172a", fontSize: 34 },
  sub: { marginTop: 8, color: "#334155" },

  tools: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    background: "white",
    border: "1px solid rgba(15,23,42,0.12)",
  },
  colorRow: { display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 28, height: 28, borderRadius: 999, border: "none", cursor: "pointer" },
  row: { marginTop: 12, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", alignItems: "center" },
  toolBtn: { padding: "10px 14px", borderRadius: 14, border: "1px solid rgba(15,23,42,0.15)", cursor: "pointer", fontWeight: 900 },
  sizeBox: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,0.15)" },
  clearBtn: { padding: "10px 14px", borderRadius: 14, border: "1px solid rgba(15,23,42,0.15)", background: "white", cursor: "pointer", fontWeight: 900 },

  canvasWrap: { marginTop: 14, display: "flex", justifyContent: "center" },
  canvas: { border: "2px solid #0f172a", borderRadius: 16, background: "white", touchAction: "none" },

  speakBtn: {
    marginTop: 16,
    width: "100%",
    padding: "16px 18px",
    borderRadius: 18,
    border: "none",
    background: "#0f172a",
    color: "white",
    fontSize: 20,
    fontWeight: 1000,
    cursor: "pointer",
  },
  tip: { marginTop: 10, fontSize: 13, color: "#64748b" },
};