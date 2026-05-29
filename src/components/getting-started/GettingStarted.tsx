"use client";

import { useState } from "react";
import { Pencil, Check, MessageCircleQuestion } from "lucide-react";
import { useSetupStatus } from "./useSetupStatus";
import { cn } from "@/lib/utils";

/**
 * Getting-started Home — the first screen a new/empty seller sees. Guides them
 * from empty to first value via a setup checklist. This commit lays down the
 * container, the 12-column grid and the header band; the cards follow.
 */
export function GettingStarted() {
  const { loading, workspaceName, renameWorkspace, doneCount, total } = useSetupStatus();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* 1 ── HEADER BAND ───────────────────────────────────────────────── */}
        <header className="col-span-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--c-text)]">Давайте начнём</h1>
            {loading ? (
              <div className="skeleton mt-2 h-5 w-48" />
            ) : (
              <WorkspaceName name={workspaceName} onRename={renameWorkspace} />
            )}
          </div>

          <p className="shrink-0 text-sm text-[var(--c-text2)]">
            Вопросы?{" "}
            <a
              href="mailto:support@sellermap.ru"
              className="inline-flex items-center gap-1 text-[var(--c-text)] underline decoration-[var(--c-text3)] underline-offset-2 hover:decoration-[var(--c-text)]"
            >
              <MessageCircleQuestion className="h-4 w-4" /> Напишите нам
            </a>
          </p>
        </header>

        {/* ── Structural placeholders (cards built in the next commits) ───── */}
        <Placeholder className="col-span-12 lg:col-span-4" label="2A · Подключите маркетплейс" />
        <Placeholder className="col-span-12 lg:col-span-4" label="2B · Заполните каталог" />
        <Placeholder className="col-span-12 lg:col-span-4 lg:row-span-2" label={`3 · Настройка · ${doneCount}/${total}`} tall />

        <Placeholder className="col-span-12 lg:col-span-4" label="4A · Приём оплаты телефоном" />
        <Placeholder className="col-span-12 lg:col-span-4" label="4B · Локации и склады" />

        <Placeholder className="col-span-12" label="5 · Помощь: WB · СБП · 54-ФЗ" />
      </div>
    </div>
  );
}

function WorkspaceName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); onRename(draft); setEditing(false); }}
        className="mt-1 flex items-center gap-2"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onRename(draft); setEditing(false); }}
          className="rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-2.5 py-1 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]"
        />
        <button type="submit" className="rounded-md p-1 text-[var(--c-green)] hover:bg-[var(--c-bg3)]">
          <Check className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => { setDraft(name); setEditing(true); }}
      className="group mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)]"
    >
      <span className="font-medium">{name}</span>
      <Pencil className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function Placeholder({ className, label, tall }: { className?: string; label: string; tall?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-bg2)] p-5 text-sm text-[var(--c-text3)]",
        tall ? "min-h-[260px]" : "min-h-[140px]",
        className,
      )}
    >
      {label}
    </div>
  );
}
