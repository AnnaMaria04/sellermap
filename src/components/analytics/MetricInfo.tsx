"use client";

import { useState, useRef, type ReactNode } from "react";
import type { MetricDef } from "@/lib/analytics/metrics";
import { cn } from "@/lib/utils";

/**
 * Dotted-underline metric title that reveals a description + formula card on
 * hover/focus — mirrors the Shopify analytics info popover.
 */
export function MetricInfo({
  metric,
  className,
  children,
}: {
  metric: MetricDef;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hide() {
    closeTimer.current = setTimeout(() => setOpen(false), 60);
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        tabIndex={0}
        className={cn(
          "cursor-default font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4 outline-none",
          className,
        )}
      >
        {children ?? metric.title}
      </span>

      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3 text-left shadow-lg"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <span className="block text-sm font-semibold text-[var(--c-text)]">{metric.title}</span>
          <span className="mt-1 block text-sm text-[var(--c-text2)]">{metric.description}</span>
          {metric.formula && (
            <span className="mt-2 block rounded-md bg-[var(--c-bg3)] px-2 py-1.5 font-mono text-xs text-[var(--c-green)]">
              {metric.formula}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
