"use client";

import { Camera, FileText, HelpCircle, Image, ListChecks, Loader2, MessageSquare, SearchCheck, Sparkles, Tags, WalletCards } from "lucide-react";
import { useState } from "react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { statusTone } from "./result-style";

const icons = [Camera, Image, Tags, SearchCheck, FileText, ListChecks, MessageSquare, HelpCircle, WalletCards, Sparkles];

type GeneratedCard = {
  title: string;
  description: string;
  keywords: string;
  attributes: string;
};

export function CardAudit({ result }: { result: ProductResult }) {
  const [generated, setGenerated] = useState<GeneratedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateCard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.title,
          category: result.category,
          price: result.margin.sellingPrice,
          competitors: result.competitors.map((item) => ({
            name: item.name,
            strength: item.strength,
            weakness: item.weakness,
            insight: item.aiInsight,
          })),
          auditNotes: result.cardAudit
            .map((item) => `${item.label}: ${item.explanation}. Действие: ${item.action}`)
            .join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Не удалось создать карточку");
      }
      setGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать карточку");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="section-kicker">Аудит карточки товара</h2>
        <p className="mt-3 text-sm text-[var(--c-text2)]">
          Что мешает конверсии и поисковому трафику.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.cardAudit.map((item, index) => {
          const Icon = icons[index] ?? ListChecks;
          return (
            <div key={item.label} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{item.label}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                      {item.score}/100
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[var(--c-text2)]">{item.explanation}</p>
                  <p className="mt-2 rounded-lg bg-[var(--c-bg2)] p-2 text-sm leading-5 text-[var(--c-text)]">
                    {item.action}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={generateCard}
        disabled={loading}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-medium text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
        Создать карточку товара с AI
      </button>
      {error && (
        <p className="mt-3 rounded-lg bg-[var(--c-red-dim)] p-3 text-sm text-[var(--c-red)]">
          {error}
        </p>
      )}
      {generated && (
        <div className="mt-5 space-y-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
          <GeneratedBlock label="Заголовок" value={generated.title} />
          <GeneratedBlock label="Описание" value={generated.description} />
          <GeneratedBlock label="Ключевые фразы" value={generated.keywords} />
          <GeneratedBlock label="Характеристики" value={generated.attributes} />
        </div>
      )}
    </Card>
  );
}

function GeneratedBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--c-text)]">{value}</p>
    </div>
  );
}
