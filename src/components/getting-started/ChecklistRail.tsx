"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { SetupStatus } from "./useSetupStatus";
import { cn } from "@/lib/utils";

interface Item {
  key: keyof SetupStatus;
  label: string;
  href: string;
}

const ITEMS: Item[] = [
  { key: "marketplace", label: "Подключить маркетплейс", href: "/inventory/settings/integrations" },
  { key: "catalog", label: "Заполнить каталог", href: "/inventory/products/new" },
  { key: "location", label: "Добавить локацию", href: "/inventory/locations" },
  { key: "payments", label: "Настроить приём оплаты", href: "/inventory/settings/pos" },
  { key: "taxes", label: "Указать налоги и кассу", href: "/inventory/tax" },
];

/** The setup checklist: progress + a done/undone row per milestone. */
export function ChecklistRail({
  status,
  doneCount,
  total,
}: {
  status: SetupStatus;
  doneCount: number;
  total: number;
}) {
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-[var(--c-text)]">Настройка</h2>
        <span className="text-sm font-medium text-[var(--c-text2)]">
          {pct}% · {doneCount}/{total}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
        <div
          className="h-full rounded-full bg-[var(--c-green)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1">
        {ITEMS.map((item) => {
          const done = status[item.key];
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-[var(--c-bg3)]",
                  done ? "text-[var(--c-text3)]" : "text-[var(--c-text)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                    done
                      ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                      : "border-[var(--c-border2)] text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={cn("flex-1", done && "line-through")}>{item.label}</span>
                {done ? (
                  <span className="text-xs text-[var(--c-text3)]">Изменить</span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--c-text3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--c-text)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
