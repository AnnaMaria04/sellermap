"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, X, Download } from "lucide-react";
import { CustomerImportModal } from "./CustomerImportModal";

const APPS = [
  { name: "SellerMap Формы", rating: "4.4", desc: "Поп-ап формы для сбора контактов" },
  { name: "Чат и Inbox", rating: "4.7", desc: "Общение с клиентами в одном месте" },
  { name: "Loyalty & бонусы", rating: "4.9", desc: "Программа лояльности и баллы" },
  { name: "Email-рассылки", rating: "4.8", desc: "Автоматические письма клиентам" },
];

export function CustomersEmptyState() {
  const [importOpen, setImportOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1040px]">
      <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        {/* Section A */}
        <div className="flex items-start justify-between gap-6 px-8 py-8">
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-[var(--c-text)]">Всё о клиентах — в одном месте</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text2)]">
              Управляйте данными клиентов, смотрите историю заказов и объединяйте клиентов в сегменты.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/inventory/customers/new" className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">
                Добавить клиента
              </Link>
              <button onClick={() => setImportOpen(true)} className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
                Импортировать
              </button>
            </div>
          </div>
          <span className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text3)] sm:flex">
            <Users className="h-10 w-10" />
          </span>
        </div>

        {/* Section B */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg3)] px-8 py-5">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Привлекайте клиентов с приложениями</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--c-text2)]">
            Расширяйте базу: добавьте форму захвата контактов в магазин и маркетинг.
          </p>
          <button onClick={() => setAppsOpen(true)} className="mt-3 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
            Посмотреть приложения
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--c-text2)]">
        <a href="#" className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]">Подробнее о клиентах</a>
      </p>

      {importOpen && <CustomerImportModal onClose={() => setImportOpen(false)} />}

      {appsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in" onClick={() => setAppsOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <h3 className="text-base font-semibold text-[var(--c-text)]">Рекомендуемые приложения</h3>
              <button onClick={() => setAppsOpen(false)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {APPS.map((a) => (
                <div key={a.name} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--c-bg3)]">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--c-text)]">{a.name} <span className="text-xs text-[var(--c-text3)]">★ {a.rating}</span></div>
                    <div className="truncate text-xs text-[var(--c-text3)]">{a.desc}</div>
                  </div>
                  <button className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1 text-xs font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]"><Download className="h-3.5 w-3.5" /> Установить</button>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--c-border)] px-4 py-3 text-center">
              <a href="#" className="text-sm text-[var(--c-blue)] hover:underline">Больше приложений в магазине</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
