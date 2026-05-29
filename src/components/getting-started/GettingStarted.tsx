"use client";

import { useState } from "react";
import { Pencil, Check, MessageCircleQuestion, Store, Package } from "lucide-react";
import { useSetupStatus } from "./useSetupStatus";
import { SetupCard } from "./SetupCard";
import { cn } from "@/lib/utils";

/**
 * Getting-started Home — the first screen a new/empty seller sees. Guides them
 * from empty to first value via a setup checklist that fills in as data appears.
 */
export function GettingStarted() {
  const { loading, workspaceName, renameWorkspace, status, doneCount, total } = useSetupStatus();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* 1 ── HEADER BAND ───────────────────────────────────────────────── */}
        <header className="order-1 col-span-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        {/* 3 ── CHECKLIST RAIL (above cards on mobile, right rail at lg) ───── */}
        <aside className="order-2 col-span-12 self-start lg:order-3 lg:col-span-4 lg:sticky lg:top-6">
          <Placeholder label={`3 · Настройка · ${doneCount}/${total}`} tall />
        </aside>

        {/* 2 + 4 ── SETUP CARDS (left column) ─────────────────────────────── */}
        <div className="order-3 col-span-12 space-y-6 lg:order-2 lg:col-span-8">
          {/* 2 — PRIMARY SETUP */}
          <div className="grid gap-6 sm:grid-cols-2">
            {loading ? (
              <><CardSkeleton /><CardSkeleton /></>
            ) : (
              <>
                <SetupCard
                  icon={<Store className="h-5 w-5" />}
                  title="Подключите маркетплейс"
                  subtitle="Автоматически подтягивайте заказы, остатки и цены из Wildberries, Ozon и Яндекс.Маркета."
                  done={status.marketplace}
                  primary={{ label: "Подключить", href: "/inventory/settings/integrations" }}
                  secondary={{ label: "Начать с демо-данных", href: "/inventory" }}
                  footer={<ChannelLogos />}
                />
                <SetupCard
                  icon={<Package className="h-5 w-5" />}
                  title="Заполните каталог"
                  subtitle="Добавьте товары и варианты вручную или импортируйте каталог из файла."
                  done={status.catalog}
                  primary={{ label: "Добавить товар", href: "/inventory/products/new" }}
                  secondary={{ label: "Импорт", href: "/inventory/products" }}
                />
              </>
            )}
          </div>

          {/* 4 — SECONDARY SETUP (built next) */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Placeholder label="4A · Приём оплаты телефоном" />
            <Placeholder label="4B · Локации и склады" />
            <Placeholder label="4C · Налоги и касса" />
          </div>
        </div>

        {/* 5 ── HELP ROW (built next) ─────────────────────────────────────── */}
        <div className="order-4 col-span-12">
          <Placeholder label="5 · Помощь: WB · СБП · 54-ФЗ" />
        </div>
      </div>
    </div>
  );
}

function ChannelLogos() {
  const channels = ["WB", "Ozon", "Я.Маркет"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {channels.map((c) => (
        <span
          key={c}
          className="rounded-md border border-[var(--c-border)] bg-[var(--c-bg2)] px-2.5 py-1 text-xs font-medium text-[var(--c-text2)]"
        >
          {c}
        </span>
      ))}
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

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <div className="skeleton h-9 w-9 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-40" />
      <div className="skeleton mt-2 h-3 w-full" />
      <div className="skeleton mt-1.5 h-3 w-2/3" />
      <div className="skeleton mt-5 h-9 w-32" />
    </div>
  );
}

function Placeholder({ label, tall }: { label: string; tall?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-bg2)] p-5 text-sm text-[var(--c-text3)]",
        tall ? "min-h-[260px]" : "min-h-[140px]",
      )}
    >
      {label}
    </div>
  );
}
