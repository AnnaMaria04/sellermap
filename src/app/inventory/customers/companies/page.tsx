"use client";

import Link from "next/link";
import { Building2, Info, X } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useDismissedCards } from "@/components/getting-started/useDismissedCards";

export default function CompaniesPage() {
  const { isDismissed, dismiss } = useDismissedCards();

  return (
    <InventoryShell title="Компании">
      <div className="mx-auto max-w-[820px]">
        {!isDismissed("b2b-banner") && (
          <div className="relative mb-5 rounded-xl border border-[var(--c-blue)]/30 bg-[var(--c-blue)]/10 p-3 pr-9 text-sm text-[var(--c-text2)]">
            <button onClick={() => dismiss("b2b-banner")} aria-label="Скрыть" className="absolute right-2 top-2 rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
            <p className="flex items-start gap-2 font-medium text-[var(--c-text)]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-blue)]" /> Поведение приложений с B2B-заказами</p>
            <p className="mt-1 pl-6">Некоторые приложения могут некорректно учитывать B2B-заказы. Убедитесь, что заказы привязаны к компании, а не только к отдельному клиенту.</p>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-14 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text3)]"><Building2 className="h-8 w-8" /></span>
          <h2 className="mt-5 text-lg font-semibold text-[var(--c-text)]">Возможности кастомизации для вашего B2B</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--c-text2)]">Всё для оптовых продаж в одном месте: компании, контакты, условия оплаты и каталоги.</p>
          <Link href="/inventory/customers/companies/new" className="mt-5 inline-flex rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">Добавить компанию</Link>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--c-text2)]"><a href="#" className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]">Подробнее о компаниях</a></p>
      </div>
    </InventoryShell>
  );
}
