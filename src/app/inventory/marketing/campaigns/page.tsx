"use client";

import Link from "next/link";
import { ArrowDownUp, FolderOpen, Megaphone } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";

export default function CampaignsPage() {
  return (
    <InventoryShell title="Кампании">
      <div className="mx-auto max-w-[920px]">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-3 py-2">
            <span className="rounded-lg bg-[var(--c-bg3)] px-3 py-1 text-sm font-medium text-[var(--c-text)]">Все</span>
            <button className="rounded-lg p-1.5 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><ArrowDownUp className="h-4 w-4" /></button>
          </div>

          {/* Card 1 */}
          <div className="flex items-start justify-between gap-6 border-b border-[var(--c-border)] px-6 py-7">
            <div className="max-w-md">
              <h2 className="text-base font-semibold text-[var(--c-text)]">Централизуйте отслеживание кампаний</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text2)]">Создавайте кампании, чтобы оценивать, как маркетинговые активности влияют на бизнес-цели.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/inventory/marketing/campaigns/new" className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">Создать кампанию</Link>
                <a href="#" className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">Подробнее</a>
              </div>
            </div>
            <span className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--c-bg3)] text-[var(--c-text3)] sm:flex"><FolderOpen className="h-8 w-8" /></span>
          </div>

          {/* Card 2 */}
          <div className="flex items-start justify-between gap-6 bg-[var(--c-bg3)] px-6 py-5">
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-[var(--c-text)]">Привлекайте трафик с маркетинговыми приложениями</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--c-text2)]">Расширяйте аудиторию в соцсетях и на других площадках.</p>
              <a href="#" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"><Megaphone className="h-4 w-4" /> Открыть приложения</a>
            </div>
          </div>
        </div>
      </div>
    </InventoryShell>
  );
}
