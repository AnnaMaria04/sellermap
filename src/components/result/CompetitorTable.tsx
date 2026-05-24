"use client";
import type { Competitor } from "@/lib/analysis/types";
import { formatRub } from "@/lib/utils";

export function CompetitorTable({ competitors, ourPrice }: { competitors: Competitor[]; ourPrice: number }) {
  const rows = [...competitors].sort((a, b) => b.reviews - a.reviews);
  return (
    <div>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 56px 70px 88px", gap: 10, padding: "5px 10px", fontSize: 10, fontWeight: 600, color: "var(--c-text3)", letterSpacing: ".04em", marginBottom: 2 }}>
        <span>Товар</span>
        <span>Продавец</span>
        <span style={{ textAlign: "right" }}>Цена</span>
        <span style={{ textAlign: "right" }}>Рейтинг</span>
        <span style={{ textAlign: "right" }}>Отзывы</span>
        <span style={{ textAlign: "right" }}>Спрос</span>
      </div>
      {rows.map((c, i) => (
        <div key={c.nmId} style={{
          display: "grid", gridTemplateColumns: "1fr 120px 80px 56px 70px 88px", gap: 10,
          padding: "8px 10px", borderRadius: 6, marginBottom: 2,
          background: i % 2 === 0 ? "var(--c-bg2)" : "transparent",
        }}>
          <span style={{ fontSize: 13, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
          <span style={{ fontSize: 12, color: "var(--c-text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sellerName || "—"}</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: c.price < ourPrice ? "var(--c-red)" : c.price > ourPrice ? "var(--c-green)" : "var(--c-text)" }}>
            {formatRub(Math.round(c.price))}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: c.rating >= 4.5 ? "var(--c-green)" : c.rating >= 4 ? "var(--c-text)" : "var(--c-amber)" }}>
            {c.rating > 0 ? `★${c.rating}` : "—"}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: "var(--c-text2)" }}>{c.reviews > 0 ? c.reviews.toLocaleString("ru") : "—"}</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: "var(--c-text)" }}>{c.estimatedMonthlySales > 0 ? `~${c.estimatedMonthlySales.toLocaleString("ru")}` : "proxy"}</span>
        </div>
      ))}
      <p style={{ fontSize: 11, color: "var(--c-text3)", marginTop: 8 }}>
        Цена: <span style={{ color: "var(--c-red)" }}>красная</span> = дешевле нашей · <span style={{ color: "var(--c-green)" }}>зелёная</span> = дороже · sales показываются только если их вернул лицензированный провайдер
      </p>
    </div>
  );
}
