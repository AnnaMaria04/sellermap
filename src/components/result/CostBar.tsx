"use client";
import { useState } from "react";
import { formatRub } from "@/lib/utils";

export type CostSegment = { label: string; value: number; color: string };

export function CostBar({ costs }: { costs: CostSegment[] }) {
  const [tip, setTip] = useState<number | null>(null);
  const total = costs.reduce((s, c) => s + c.value, 0);
  if (total <= 0) return null;
  return (
    <div>
      <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", marginBottom: 12, cursor: "default" }}>
        {costs.map((c, i) => (
          <div key={i} style={{ width: `${(c.value / total) * 100}%`, background: c.color, position: "relative" }}
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
            {tip === i && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "var(--c-bg3)", border: "1px solid var(--c-border2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--c-text)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10 }}>
                {c.label}: {formatRub(Math.round(c.value))} ({Math.round((c.value / total) * 100)}%)
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px" }}>
        {costs.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--c-text2)" }}>{c.label}: <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--c-text)", fontWeight: 500 }}>{formatRub(Math.round(c.value))}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
