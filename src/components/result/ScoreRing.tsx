"use client";
import { useEffect, useState } from "react";

function scoreColor(s: number) {
  return s >= 70 ? "var(--c-green)" : s >= 50 ? "var(--c-amber)" : "var(--c-red)";
}

export function ScoreRing({ score, size = 130 }: { score: number; size?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(score), 150);
    return () => clearTimeout(t);
  }, [score]);
  const R = 44, C = 2 * Math.PI * R;
  const col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--c-border2)" strokeWidth="7" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={col} strokeWidth="7"
          strokeDasharray={`${(v / 100) * C} ${C - (v / 100) * C}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray .75s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.082, color: "var(--c-text2)" }}>из 100</span>
      </div>
    </div>
  );
}
