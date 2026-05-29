"use client";

import type { ReactNode } from "react";

/** Shopify-style centered empty state used by the newer menu sections. */
export function PageEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text2)]">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-[var(--c-text)]">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-[var(--c-text2)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
