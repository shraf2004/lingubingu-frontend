import { useEffect } from "react";

export default function FallingDecor() {
  useEffect(() => {
    const container = document.createElement("div");
    container.className = "falling-container";
    document.body.appendChild(container);

    const interval = setInterval(() => {
      const f = document.createElement("div");
      f.className = "falling-item";
      f.style.left = Math.random() * 100 + "vw";
      f.style.animationDuration = 6 + Math.random() * 6 + "s";
      container.appendChild(f);
      setTimeout(() => f.remove(), 14000);
    }, 500);

    return () => {
      clearInterval(interval);
      container.remove();
    };
  }, []);

  return null;
}
