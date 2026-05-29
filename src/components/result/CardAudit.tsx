"use client";

import { Camera, FileText, HelpCircle, Image, ListChecks, Loader2, MessageSquare, SearchCheck, Sparkles, Tags, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import type { CardAuditItem, ProductResult } from "@/lib/analysis/types";
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

  // Real audit pulled from the DB (snapshots + keywords + market context).
  // Falls back to result.cardAudit (seed) when the API has nothing.
  const [items, setItems] = useState<CardAuditItem[]>(result.cardAudit);
  const [auditState, setAuditState] = useState<"idle" | "loading" | "error">("idle");
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [auditSource, setAuditSource] = useState<"db" | "seed">("seed");

  useEffect(() => {
    let cancelled = false;
    if (!result.nmId) return;
    setAuditState("loading");
    setAuditMessage(null);
    fetch(`/api/analysis/card-audit?nmId=${encodeURIComponent(result.nmId)}`)
      .then(async (r) => {
        const d = (await r.json()) as { ok: boolean; items?: CardAuditItem[]; message?: string; meta?: { snapshotCount?: number } };
        if (cancelled) return;
        if (!d.ok) {
          setAuditState("error");
          setAuditMessage(d.message ?? "не удалось загрузить аудит");
          return;
        }
        if (d.items && d.items.length > 0 && (d.meta?.snapshotCount ?? 0) > 0) {
          setItems(d.items);
          setAuditSource("db");
        }
        setAuditState("idle");
      })
      .catch((e) => {
        if (cancelled) return;
        setAuditState("error");
        setAuditMessage(e instanceof Error ? e.message : "сетевая ошибка");
      });
    return () => { cancelled = true; };
  }, [result.nmId]);

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
          auditNotes: items
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
        {auditState === "loading" && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--c-text3)]">
            <Loader2 size={12} className="animate-spin" /> Считаю по снимкам wb_product_snapshots…
          </p>
        )}
        {auditState === "error" && (
          <p className="mt-2 text-xs text-[var(--c-amber)]">Не удалось загрузить реальный аудит: {auditMessage}. Показываю демо.</p>
        )}
        {auditState === "idle" && auditSource === "db" && (
          <p className="mt-2 text-xs text-[var(--c-green)]">Аудит посчитан по реальным снимкам карточки.</p>
        )}
        {auditState === "idle" && auditSource === "seed" && (
          <p className="mt-2 text-xs text-[var(--c-text3)]">Снимков по этой карточке пока нет — показываем демо-аудит.</p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, index) => {
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
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
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
