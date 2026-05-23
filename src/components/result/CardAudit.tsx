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

type Tab = "title" | "description" | "keywords" | "attributes";

const TABS: { key: Tab; label: string }[] = [
  { key: "title", label: "Заголовок" },
  { key: "description", label: "Описание" },
  { key: "keywords", label: "Ключевые слова" },
  { key: "attributes", label: "Характеристики" },
];

export function CardAudit({ result }: { result: ProductResult }) {
  const [generated, setGenerated] = useState<GeneratedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("title");

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
      setActiveTab("title");
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

      {/* Card generation button */}
      <button
        type="button"
        onClick={generateCard}
        disabled={loading}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-medium text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
        ✦ Создать карточку товара
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--c-red-dim)] p-3 text-sm text-[var(--c-red)]">
          {error}
        </p>
      )}

      {/* Tabbed generated card */}
      {generated && (
        <div className="mt-5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)]">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--c-border)]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "border-b-2 border-[var(--c-green)] text-[var(--c-green)]"
                    : "text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="p-4">
            <p className="whitespace-pre-line text-sm leading-6 text-[var(--c-text)]">
              {generated[activeTab]}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
