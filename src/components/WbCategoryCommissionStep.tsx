"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestWbCategoriesFromTitle } from "@/services/categoryMatcher";
import type { CommissionMatch } from "@/types/sellermap";

export function WbCategoryCommissionStep({
  title,
  commissionPercent,
  onChange,
}: {
  title: string;
  commissionPercent: string;
  onChange: (match: CommissionMatch) => void;
}) {
  const suggestions = useMemo(() => suggestWbCategoriesFromTitle(title), [title]);
  const [category, setCategory] = useState(suggestions[0] ?? "");
  const [commission, setCommission] = useState(commissionPercent || "15");

  function apply(source: CommissionMatch["source"] = "manual") {
    onChange({
      categoryName: category,
      commissionPercent: Number(commission) || 0,
      source,
      confidence: source === "manual" ? 0.55 : 0.75,
    });
  }

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="section-kicker border-t-0 pt-0">Категория и комиссия WB</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setCategory(item)}
            className="rounded-full bg-[var(--c-bg3)] px-3 py-1 text-xs text-[var(--c-text2)]"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Категория WB" />
        <Input type="number" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="Комиссия, %" />
        <Button type="button" variant="secondary" onClick={() => apply("manual")}>
          Применить
        </Button>
      </div>
      <p className="mt-3 text-xs text-[var(--c-text3)]">Если WB API тарифов подключён, комиссия позже будет подтверждаться по категории.</p>
    </div>
  );
}
