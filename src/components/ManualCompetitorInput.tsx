"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseWbNmIdFromUrl } from "@/lib/parseWbUrl";
import type { CompetitorProduct } from "@/types/sellermap";

const emptyCompetitor = (): CompetitorProduct => ({
  title: "",
  price: null,
  reviewCount: null,
  rating: null,
  sellerName: "",
  source: "manual",
});

export function ManualCompetitorInput({
  competitors,
  onChange,
}: {
  competitors: CompetitorProduct[];
  onChange: (competitors: CompetitorProduct[]) => void;
}) {
  function update(index: number, patch: Partial<CompetitorProduct>) {
    onChange(competitors.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="section-kicker border-t-0 pt-0">Конкуренты вручную</p>
        <Button type="button" variant="secondary" onClick={() => onChange([...competitors, emptyCompetitor()])}>
          <Plus size={15} />
          Добавить
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {competitors.map((competitor, index) => (
          <div key={index} className="grid gap-2 rounded-lg bg-[var(--c-bg3)] p-3 md:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.7fr_auto]">
            <Input
              placeholder="WB link"
              value={competitor.url ?? ""}
              onChange={(event) =>
                update(index, {
                  url: event.target.value,
                  nmId: parseWbNmIdFromUrl(event.target.value),
                })
              }
            />
            <Input placeholder="Название" value={competitor.title} onChange={(event) => update(index, { title: event.target.value })} />
            <Input type="number" placeholder="Цена" value={competitor.price ?? ""} onChange={(event) => update(index, { price: Number(event.target.value) || null })} />
            <Input type="number" placeholder="Отзывы" value={competitor.reviewCount ?? ""} onChange={(event) => update(index, { reviewCount: Number(event.target.value) || null })} />
            <Input type="number" placeholder="Рейтинг" value={competitor.rating ?? ""} onChange={(event) => update(index, { rating: Number(event.target.value) || null })} />
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-red)]"
              onClick={() => onChange(competitors.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {competitors.length === 0 && (
          <p className="text-sm text-[var(--c-text3)]">Добавьте 3-10 конкурентов, если MPStats не подключён.</p>
        )}
      </div>
    </div>
  );
}
