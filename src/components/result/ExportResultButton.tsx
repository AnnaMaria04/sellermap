"use client";

import { Download } from "lucide-react";
import { exportData } from "@/lib/export";
import { formatRub } from "@/lib/utils";
import type { ProductResult } from "@/lib/analysis/types";

export function ExportResultButton({ result }: { result: ProductResult }) {
  function handleExport() {
    const rows = result.scoreBreakdown.map((b) => ({
      label: b.label,
      score: b.score,
      status: b.status,
      note: b.note,
    }));

    exportData({
      filename: `sellermap_${result.nmId}`,
      title: `Анализ товара — ${result.title}`,
      subtitle: `${result.category} · nmId ${result.nmId} · ${result.verdict}`,
      meta: [
        { label: "Оценка", value: `${result.score}/100` },
        { label: "Вердикт", value: result.verdictChip },
        { label: "Маржа", value: `${result.margin.marginPercent.toFixed(1)}%` },
        { label: "Прибыль/шт", value: formatRub(result.margin.profit) },
        { label: "Цена продажи", value: formatRub(result.margin.sellingPrice) },
        { label: "Безубыточность", value: formatRub(result.margin.breakEvenPrice) },
        { label: "Безопасная цена", value: `${formatRub(result.margin.safePriceMin)}–${formatRub(result.margin.safePriceMax)}` },
      ],
      columns: [
        { key: "label", label: "Критерий" },
        { key: "score", label: "Балл", align: "right" },
        { key: "status", label: "Статус" },
        { key: "note", label: "Комментарий" },
      ],
      rows,
      format: "pdf",
    });
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] bg-transparent px-5 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
    >
      <Download size={16} />
      Экспорт PDF
    </button>
  );
}
