"use client";

import { Percent, Boxes, Printer, ClipboardList, ShieldCheck, Package } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";

const BULLETS = [
  { icon: Percent, text: "Скидки до 87% на этикетки доставки" },
  { icon: Boxes, text: "Заказы со всех каналов продаж в одном месте" },
  { icon: Printer, text: "Пакетная печать до 250 этикеток" },
  { icon: ClipboardList, text: "Списки комплектации по ячейкам склада" },
  { icon: ShieldCheck, text: "Страховка на каждую отправку" },
];

const CARRIERS = [
  { name: "Почта России", days: "4–5 рабочих дней", tag: "Дешевле" },
  { name: "СДЭК", days: "1–2 рабочих дня", tag: "Быстрее" },
  { name: "Boxberry", days: "2–3 рабочих дня", tag: "" },
];

export default function ShippingLabelsPage() {
  return (
    <InventoryShell title="Этикетки доставки" actions={<MoreActions />}>
      <div className="mx-auto max-w-[1040px]">
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-8">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Всё, что нужно для отправки — в одном месте
              </h2>
              <ul className="mt-5 space-y-3">
                {BULLETS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-[var(--c-text2)]">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-text3)]" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-6 rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
                Рассчитать тарифы
              </button>
            </div>

            {/* Carrier preview + parcels */}
            <div className="relative flex flex-col items-end gap-2">
              {CARRIERS.map((c) => (
                <div
                  key={c.name}
                  className="flex w-64 items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--c-bg3)] text-[var(--c-text3)]">
                      <Package className="h-4 w-4" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-medium text-[var(--c-text)]">{c.name}</div>
                      <div className="text-xs text-[var(--c-text3)]">{c.days}</div>
                    </div>
                  </div>
                  {c.tag && (
                    <span className="rounded-md bg-[var(--c-bg3)] px-1.5 py-0.5 text-xs font-medium text-[var(--c-text2)]">
                      {c.tag}
                    </span>
                  )}
                </div>
              ))}
              <ParcelsArt />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--c-text2)]">
          <a href="#" className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]">
            Подробнее о покупке этикеток доставки
          </a>
        </p>
      </div>
    </InventoryShell>
  );
}

function MoreActions() {
  return (
    <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
      Действия
    </button>
  );
}

function ParcelsArt() {
  return (
    <svg width="220" height="120" viewBox="0 0 220 120" fill="none" aria-hidden className="mt-2">
      <rect x="120" y="60" width="80" height="50" rx="4" fill="var(--c-bg3)" stroke="var(--c-border2)" />
      <rect x="70" y="80" width="60" height="30" rx="4" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="150" y="34" width="44" height="30" rx="4" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="132" y="74" width="16" height="20" rx="2" fill="var(--c-bg)" stroke="var(--c-border2)" />
      <rect x="162" y="42" width="12" height="14" rx="2" fill="var(--c-bg)" stroke="var(--c-border2)" />
    </svg>
  );
}
