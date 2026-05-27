"use client";

import { CreditCard, Check, Mail } from "lucide-react";

export default function SettingsBillingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-text)]">Биллинг</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Тарифный план и история оплат</p>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--c-text3)]">Текущий тариф</p>
            <p className="mt-0.5 text-lg font-bold text-[var(--c-text)]">Бесплатный</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.3)] bg-[var(--c-green-dim)] px-3 py-1 text-xs font-medium text-[var(--c-green)]">
            <Check size={12} /> Активен
          </span>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[var(--c-text2)]">
          {["Неограниченные товары и заказы", "Интеграции Wildberries и Ozon", "P&L, налоги и КУДиР"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check size={14} className="shrink-0 text-[var(--c-green)]" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-12 text-center">
        <CreditCard size={36} className="mb-3 text-[var(--c-text3)]" />
        <p className="text-base font-semibold text-[var(--c-text)]">Платные тарифы — скоро</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--c-text3)]">
          Расширенная аналитика, командный доступ и приоритетная поддержка появятся в следующем обновлении.
        </p>
        <a
          href="mailto:support@sellermap.ru"
          className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          <Mail size={14} /> Связаться с поддержкой
        </a>
      </div>
    </div>
  );
}
