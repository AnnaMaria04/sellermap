"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A card that reveals a small dismiss (×) control in its top-right corner on
 * hover; hovering the × shows a «Скрыть» tooltip. Clicking it hides the card.
 * The dismissed state is owned by the parent (persisted via useDismissedCards).
 */
export function DismissibleCard({
  onDismiss,
  className,
  children,
}: {
  onDismiss: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/dismiss relative rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] transition hover:shadow-[0_1px_12px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="group/x absolute right-3 top-3 z-10 opacity-0 transition group-hover/dismiss:opacity-100">
        <button
          type="button"
          aria-label="Скрыть"
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--c-text)] transition hover:bg-[var(--c-bg3)]"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Tooltip on the × itself */}
        <span className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-[var(--c-text)] px-2 py-1 text-xs font-medium text-[var(--c-bg)] opacity-0 transition group-hover/x:opacity-100">
          Скрыть
        </span>
      </div>
      {children}
    </div>
  );
}
