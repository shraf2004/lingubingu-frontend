import { useEffect } from "react";

export default function CursorSparkles() {
  useEffect(() => {
    function sparkle(e) {
      const s = document.createElement("div");
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      s.className = "cursor-sparkle";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 600);
    }

    window.addEventListener("mousemove", sparkle);
    return () => window.removeEventListener("mousemove", sparkle);
  }, []);

  return null;
}
