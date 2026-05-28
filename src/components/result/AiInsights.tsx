"use client";

import { Bot, ClipboardCheck, FlaskConical, Loader2, RefreshCw, ShieldAlert, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AiInsights as AiInsightsType, ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";

const groups = [
  ["Что хорошо", "good", ThumbsUp],
  ["Что мешает запуску", "blockers", ShieldAlert],
  ["Что проверить перед закупкой", "beforePurchase", ClipboardCheck],
  ["Какой тест запустить первым", "firstTest", FlaskConical],
] as const;

type ApiResponse = { ok: boolean; configured?: boolean; insights?: AiInsightsType; message?: string };

export function AiInsights({ result }: { result: ProductResult }) {
  const [insights, setInsights] = useState<AiInsightsType | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "unconfigured">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/analysis/product-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          category: result.category,
          sellingPrice: result.margin.sellingPrice,
          marginPercent: result.margin.marginPercent,
          profitPerUnit: result.margin.profit,
          breakEvenPrice: result.margin.breakEvenPrice,
          packagingRisk: result.packaging.riskLevel,
          packagingNote: result.packaging.note,
          competitorSummary: result.competitors.slice(0, 5).map((c) =>
            `${c.name} · ${c.price} ₽ · ${c.rating} ★ · ${c.reviews} отзывов`,
          ),
        }),
      });
      const d = (await res.json()) as ApiResponse;
      if (d.configured === false) {
        setState("unconfigured");
        return;
      }
      if (!d.ok || !d.insights) {
        setState("error");
        setMessage(d.message ?? "не удалось получить ответ модели");
        return;
      }
      setInsights(d.insights);
      setState("idle");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "сетевая ошибка");
    }
  }, [result]);

  useEffect(() => { void fetchInsights(); }, [fetchInsights]);

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal text-mint">
            <Bot size={18} />
          </span>
          <div>
            <h2 className="section-kicker">AI-вывод</h2>
            <p className="mt-3 text-sm text-[var(--c-text2)]">Короткая интерпретация для решения.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchInsights}
          disabled={state === "loading"}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] disabled:opacity-50"
        >
          <RefreshCw size={12} className={state === "loading" ? "animate-spin" : ""} /> Обновить
        </button>
      </div>

      {state === "unconfigured" && (
        <p className="rounded-lg border border-dashed border-[var(--c-border)] p-3 text-xs text-[var(--c-text3)]">
          AI-анализ пока недоступен — как только модель будет подключена, здесь появятся выводы по этой карточке.
        </p>
      )}
      {state === "loading" && !insights && (
        <p className="inline-flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)]/40 p-3 text-xs text-[var(--c-text3)]">
          <Loader2 size={12} className="animate-spin" /> Считаю выводы по данным карточки…
        </p>
      )}
      {state === "error" && (
        <p className="rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red)]/10 p-3 text-xs text-[var(--c-red)]">
          Не удалось получить выводы: {message}.
        </p>
      )}

      {insights && (
        <div className="grid gap-4 lg:grid-cols-4">
          {groups.map(([label, key, Icon]) => (
            <div key={key} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
              <Icon size={18} className="text-primary-green" />
              <h3 className="mt-3 font-semibold">{label}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-[var(--c-text2)]">
                {insights[key].length === 0 ? (
                  <li className="text-[var(--c-text3)]">—</li>
                ) : (
                  insights[key].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-green)]" />
                      {item}
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
