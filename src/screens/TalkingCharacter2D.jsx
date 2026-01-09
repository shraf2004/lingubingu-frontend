import { useEffect, useMemo, useState } from "react";

function mapViseme(v) {
  if (!v) return "closed";
  if ([9, 10, 11, 12, 13, 14].includes(v)) return "o";
  if ([3, 4, 5, 6].includes(v)) return "wide";
  if ([18, 19, 20, 21].includes(v)) return "teeth";
  return "open";
}

export default function TalkingCharacter2D({ imageSrc, visemeId, speaking }) {
  const mouth = useMemo(() => mapViseme(visemeId), [visemeId]);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const i = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 4000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={stage}>
      <div style={{ ...wrap, animation: speaking ? "talk 1.2s infinite" : "idle 3.5s infinite" }}>
        <img src={imageSrc} style={img} />
        <div style={mouthBox}>
          <Mouth shape={mouth} speaking={speaking} />
        </div>
        {blink && <div style={blinkLayer} />}
      </div>
      <style>{css}</style>
    </div>
  );
}

function Mouth({ shape, speaking }) {
  if (!speaking)
    return (
      <svg viewBox="0 0 110 70">
        <path d="M20 35 Q55 55 90 35" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (shape === "closed")
    return (
      <svg viewBox="0 0 110 70">
        <path d="M25 40 Q55 45 85 40" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (shape === "o")
    return (
      <svg viewBox="0 0 110 70">
        <ellipse cx="55" cy="38" rx="18" ry="22" fill="#111" />
      </svg>
    );
  if (shape === "teeth")
    return (
      <svg viewBox="0 0 110 70">
        <path d="M25 25 Q55 8 85 25 Q95 38 85 52 Q55 64 25 52 Q15 38 25 25Z" fill="#111" />
        <rect x="34" y="32" width="42" height="12" fill="#fff" />
      </svg>
    );
  if (shape === "wide")
    return (
      <svg viewBox="0 0 110 70">
        <path d="M18 25 Q55 5 92 25 Q98 38 92 53 Q55 68 18 53 Q12 38 18 25Z" fill="#111" />
      </svg>
    );
  return (
    <svg viewBox="0 0 110 70">
      <path d="M25 22 Q55 6 85 22 Q96 38 85 56 Q55 68 25 56 Q14 38 25 22Z" fill="#111" />
    </svg>
  );
}

const stage = { display: "flex", justifyContent: "center" };
const wrap = {
  width: 420,
  height: 420,
  position: "relative",
  borderRadius: 24,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 10px 30px rgba(0,0,0,.2)",
};
const img = { width: "100%", height: "100%", objectFit: "contain" };
const mouthBox = { position: "absolute", left: "50%", top: "62%", transform: "translate(-50%,-50%)", width: 130, height: 90 };
const blinkLayer = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 35% 35%,rgba(0,0,0,.25) 0 10%,transparent 12%),radial-gradient(circle at 65% 35%,rgba(0,0,0,.25) 0 10%,transparent 12%)",
};
const css = `
@keyframes idle{0%{transform:translateY(0)}50%{transform:translateY(-8px)}100%{transform:translateY(0)}}
@keyframes talk{0%{transform:translateY(0)}50%{transform:translateY(-12px)}100%{transform:translateY(0)}}
`;