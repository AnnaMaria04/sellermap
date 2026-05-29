"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { moduleForRoute, MODULE_BY_ID } from "@/lib/modules/registry";
import type { ReactNode } from "react";

/**
 * Guards `/inventory/**` deep links: if the route's owning module is turned off,
 * show an "enable it" panel instead of the page. Nothing is deleted — the page
 * still exists and one click re-enables it. No-op while modules are loading
 * (avoids redirect races with onboarding).
 */
export function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { enabled, isEnabled, setOverride } = useEnabledModules();

  // Loading / gating-off → render normally.
  if (!enabled) return <>{children}</>;

  const moduleId = moduleForRoute(pathname);
  if (!moduleId || isEnabled(moduleId)) return <>{children}</>;

  const def = MODULE_BY_ID[moduleId];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text2)]">
        <SlidersHorizontal className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-[var(--c-text)]">Модуль «{def.label}» выключен</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text2)]">
        {def.description}. Включите его, чтобы пользоваться этим разделом — данные не теряются.
      </p>
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setOverride(moduleId, true)}
          className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90"
        >
          Включить модуль
        </button>
        <Link
          href="/inventory/settings/modules"
          className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]"
        >
          Все модули
        </Link>
      </div>
    </div>
  );
}
