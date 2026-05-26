"use client";

import { CreditCard } from "lucide-react";

export default function SettingsBillingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-text)]">Биллинг</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Тарифный план и история оплат</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-20 text-center">
        <CreditCard size={40} className="mb-4 text-[var(--c-text3)]" />
        <p className="text-base font-semibold text-[var(--c-text)]">Биллинг — скоро</p>
        <p className="mt-1 text-sm text-[var(--c-text3)]">Управление подпиской появится в следующем обновлении</p>
      </div>
    </div>
  );
}
