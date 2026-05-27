"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Sparkles, Send, Loader2, MessageSquare, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadIntegrations } from "@/lib/supabase/integrations-store";
import { toast } from "sonner";

interface Review { id: string; text: string; rating: number; product: string; date: string }
interface Question { id: string; text: string; product: string; date: string }

type Tab = "reviews" | "questions";

export function FeedbacksPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/wb/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const d = await res.json();
      if (!d.ok) { setError(d.message ?? "Ошибка загрузки"); }
      else { setReviews(d.feedbacks ?? []); setQuestions(d.questions ?? []); }
    } catch {
      setError("Не удалось загрузить");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (!supabase) { setLoading(false); setError("Нет подключения"); return; }
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) { setLoading(false); setError("Нет сессии"); return; }
      const ints = await loadIntegrations(supabase, userId).catch(() => []);
      const wb = ints.find((i) => i.kind === "wildberries");
      const t = wb?.credentials.statisticsToken?.trim() || wb?.credentials.contentToken?.trim() || null;
      if (!t) { setLoading(false); setError("Подключите Wildberries в Интеграциях"); return; }
      setToken(t);
      void load(t);
    })();
  }, [load]);

  async function generate(kind: Tab, item: Review | Question) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kind === "reviews" ? "review" : "question",
          text: item.text,
          rating: "rating" in item ? item.rating : undefined,
          product: item.product,
        }),
      });
      const d = await res.json();
      if (d.ok && d.reply) setDrafts((p) => ({ ...p, [item.id]: d.reply }));
      else toast.error(d.message ?? "ИИ недоступен — напишите ответ вручную");
    } catch { toast.error("Ошибка генерации"); }
    setBusy(null);
  }

  async function send(kind: Tab, id: string) {
    const text = drafts[id]?.trim();
    if (!token || !text) return;
    setBusy(id);
    try {
      const res = await fetch("/api/integrations/wb/feedbacks/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kind: kind === "reviews" ? "review" : "question", id, text }),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success("Ответ отправлен");
        if (kind === "reviews") setReviews((r) => r.filter((x) => x.id !== id));
        else setQuestions((q) => q.filter((x) => x.id !== id));
      } else toast.error(d.message ?? "Не удалось отправить");
    } catch { toast.error("Ошибка отправки"); }
    setBusy(null);
  }

  const items: (Review | Question)[] = tab === "reviews" ? reviews : questions;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
        {([["reviews", "Отзывы", reviews.length], ["questions", "Вопросы", questions.length]] as const).map(
          ([id, label, n]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                tab === id ? "bg-[var(--c-bg3)] text-[var(--c-text)]" : "text-[var(--c-text2)] hover:text-[var(--c-text)]"
              }`}
            >
              {id === "reviews" ? <MessageSquare size={15} /> : <HelpCircle size={15} />}
              {label} {n > 0 && <span className="text-[var(--c-text3)]">{n}</span>}
            </button>
          ),
        )}
      </div>

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-[var(--c-text3)]"><Loader2 size={16} className="animate-spin" /> Загрузка…</div>}
      {!loading && error && <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6 text-sm text-[var(--c-text2)]">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-10 text-center text-sm text-[var(--c-text3)]">
          Нет неотвеченных {tab === "reviews" ? "отзывов" : "вопросов"} 🎉
        </div>
      )}

      <div className="space-y-3">
        {!loading && !error && items.map((it) => (
          <div key={it.id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {it.product && <p className="truncate text-xs text-[var(--c-text3)]">{it.product}</p>}
                {"rating" in it && (
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} className={i < it.rating ? "fill-[var(--c-amber)] text-[var(--c-amber)]" : "text-[var(--c-border2)]"} />
                    ))}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs text-[var(--c-text3)]">{it.date}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--c-text)]">{it.text || <span className="text-[var(--c-text3)]">— без текста —</span>}</p>

            <textarea
              value={drafts[it.id] ?? ""}
              onChange={(e) => setDrafts((p) => ({ ...p, [it.id]: e.target.value }))}
              rows={3}
              placeholder="Ваш ответ…"
              className="mt-3 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] p-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
            />
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => generate(tab, it)}
                disabled={busy === it.id}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)] disabled:opacity-50"
              >
                {busy === it.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Сгенерировать ответ
              </button>
              <button
                onClick={() => send(tab, it.id)}
                disabled={busy === it.id || !drafts[it.id]?.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:opacity-50"
              >
                <Send size={14} /> Отправить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
