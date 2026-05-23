"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseWbNmIdFromUrl } from "@/lib/parseWbUrl";
import { generateKeywordCandidates } from "@/services/keywordSuggestionService";
import type { MarketTarget } from "@/types/sellermap";

export function MarketTargetStep({
  productTitle,
  specifications,
  onSelect,
}: {
  productTitle: string;
  specifications?: Record<string, unknown>;
  onSelect: (target: MarketTarget) => void;
}) {
  const [wbUrl, setWbUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const suggestions = useMemo(
    () => generateKeywordCandidates(productTitle, specifications),
    [productTitle, specifications],
  );

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="section-kicker border-t-0 pt-0">С чем сравниваем на Wildberries?</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm text-[var(--c-text2)]">Вставьте ссылку на похожий товар WB</span>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input value={wbUrl} onChange={(event) => setWbUrl(event.target.value)} placeholder="https://www.wildberries.ru/catalog/123456789/detail.aspx" />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onSelect({
                  mode: "wb_link",
                  wbUrl,
                  wbNmId: parseWbNmIdFromUrl(wbUrl) ?? undefined,
                  source: "user",
                })
              }
            >
              Выбрать
            </Button>
          </div>
        </label>
        <label>
          <span className="mb-2 block text-sm text-[var(--c-text2)]">Поиск по ключу</span>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="маркер POSCA, акриловый маркер" />
            <Button type="button" variant="secondary" onClick={() => onSelect({ mode: "keyword", keyword, source: "user" })}>
              Выбрать
            </Button>
          </div>
        </label>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setKeyword(item);
                onSelect({ mode: "keyword", keyword: item, source: "generated" });
              }}
              className="rounded-full border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-1 text-xs text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Категория WB" />
        <Button type="button" variant="secondary" onClick={() => onSelect({ mode: "category", category, source: "manual" })}>
          Категория
        </Button>
        <Button type="button" variant="secondary" onClick={() => onSelect({ mode: "skip", source: "user" })}>
          Посчитать только экономику
        </Button>
      </div>
    </div>
  );
}
