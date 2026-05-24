"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell, ResponsiveContainer } from "recharts";
import type { Competitor } from "@/lib/analysis/types";
import { formatRub } from "@/lib/utils";

function buildBuckets(competitors: Competitor[], ourPrice: number) {
  const prices = competitors.map((c) => c.price).filter((p) => p > 0);
  if (prices.length === 0) return [];
  const min = Math.min(...prices, ourPrice) * 0.9;
  const max = Math.max(...prices, ourPrice) * 1.1;
  const bucketSize = Math.ceil((max - min) / 5 / 100) * 100 || 300;
  const buckets: { label: string; count: number; min: number; max: number; hasOurs: boolean }[] = [];
  for (let start = Math.floor(min / bucketSize) * bucketSize; start < max; start += bucketSize) {
    const end = start + bucketSize;
    const count = prices.filter((p) => p >= start && p < end).length;
    buckets.push({
      label: `${(start / 1000).toFixed(start >= 1000 ? 0 : 1)}–${(end / 1000).toFixed(end >= 1000 ? 0 : 1)}к`,
      count,
      min: start,
      max: end,
      hasOurs: ourPrice >= start && ourPrice < end,
    });
  }
  return buckets;
}

export function MarketHistogram({ competitors, ourPrice }: { competitors: Competitor[]; ourPrice: number }) {
  const buckets = buildBuckets(competitors, ourPrice);
  if (buckets.length === 0) return <p style={{ fontSize: 12, color: "var(--c-text3)" }}>Недостаточно данных для гистограммы</p>;

  const p25Idx = Math.floor(competitors.length * 0.25);
  const p75Idx = Math.floor(competitors.length * 0.75);
  const sorted = [...competitors].sort((a, b) => a.price - b.price);
  const p25 = sorted[p25Idx]?.price ?? 0;
  const median = sorted[Math.floor(sorted.length / 2)]?.price ?? 0;
  const p75 = sorted[p75Idx]?.price ?? 0;

  return (
    <div>
      <div style={{ height: 220, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: "var(--c-text2)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--c-text2)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--c-bg3)", border: "1px solid var(--c-border2)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--c-text)", fontWeight: 600 }}
              itemStyle={{ color: "var(--c-text2)" }}
              formatter={(value: unknown) => [`${value} товаров`, "Количество"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((b, i) => (
                <Cell key={i} fill={b.hasOurs ? "var(--c-green)" : "rgba(255,255,255,0.12)"} />
              ))}
            </Bar>
            <ReferenceLine x={buckets.find((b) => b.hasOurs)?.label} stroke="var(--c-green)" strokeDasharray="4 3" label={{ value: "наша цена", fill: "var(--c-green)", fontSize: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 11, color: "var(--c-text2)", justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
        {[["P25", p25], ["Медиана", median], ["P75", p75], ["Наша", ourPrice]].map(([k, v]) => (
          <span key={String(k)}>{k}: <span style={{ fontFamily: "JetBrains Mono, monospace", color: k === "Наша" || k === "Медиана" ? "var(--c-green)" : "var(--c-text)", fontWeight: 600 }}>{formatRub(Math.round(Number(v)))}</span></span>
        ))}
      </div>
    </div>
  );
}
