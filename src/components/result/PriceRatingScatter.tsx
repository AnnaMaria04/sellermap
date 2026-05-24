"use client";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import type { Competitor } from "@/lib/analysis/types";

type Point = { x: number; y: number; r: number; name: string; reviews: number; sales: number; isOurs?: boolean };

export function PriceRatingScatter({ competitors, ourPrice }: { competitors: Competitor[]; ourPrice: number }) {
  const others: Point[] = competitors
    .filter((c) => c.rating > 0)
    .map((c) => ({
      x: c.price,
      y: c.rating,
      r: Math.max(5, Math.min(20, Math.sqrt(c.reviews + 1) * 0.5)),
      name: c.name,
      reviews: c.reviews,
      sales: c.estimatedMonthlySales,
    }));

  const ours: Point[] = [{ x: ourPrice, y: 4.0, r: 10, name: "Наш товар", reviews: 0, sales: 0, isOurs: true }];

  const CustomDot = (props: { cx?: number; cy?: number; payload?: Point }) => {
    const { cx = 0, cy = 0, payload } = props;
    if (!payload) return null;
    const r = payload.r ?? 6;
    return payload.isOurs
      ? <circle cx={cx} cy={cy} r={r} fill="var(--c-green)" stroke="var(--c-green)" strokeWidth={2} fillOpacity={0.85} />
      : <circle cx={cx} cy={cy} r={r} fill="rgba(152,152,196,0.5)" stroke="rgba(152,152,196,0.75)" strokeWidth={1.5} />;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border2)", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
        <p style={{ fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>{d.name}</p>
        <p style={{ color: "var(--c-text2)" }}>Цена: <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--c-text)" }}>{d.x.toLocaleString("ru")} ₽</span></p>
        {d.y && !d.isOurs && <p style={{ color: "var(--c-text2)" }}>Рейтинг: ★{d.y}</p>}
        {d.reviews > 0 && <p style={{ color: "var(--c-text2)" }}>Отзывы: {d.reviews.toLocaleString("ru")}</p>}
        {d.sales > 0 && <p style={{ color: "var(--c-text2)" }}>Продажи: ~{d.sales.toLocaleString("ru")} шт/мес</p>}
      </div>
    );
  };

  return (
    <div style={{ height: 280, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" dataKey="x" name="Цена" domain={["auto", "auto"]}
            tick={{ fill: "var(--c-text2)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
            axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}к`}
            label={{ value: "Цена, ₽", position: "insideBottom", offset: -10, fill: "var(--c-text2)", fontSize: 10 }}
          />
          <YAxis type="number" dataKey="y" name="Рейтинг" domain={[3, 5.5]}
            tick={{ fill: "var(--c-text2)", fontSize: 10 }} axisLine={false} tickLine={false}
            label={{ value: "Рейтинг ★", angle: -90, position: "insideLeft", fill: "var(--c-text2)", fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter name="Конкуренты" data={others} shape={<CustomDot />} />
          <Scatter name="Наш товар" data={ours} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
