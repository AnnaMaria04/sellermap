import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shopify-style two-column form layout: primary fields on the left, metadata /
 * publishing / summary in a right rail that stacks below on narrow screens.
 */
export function FormLayout({ main, aside, className }: { main: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className="space-y-5">{main}</div>
      {aside && <div className="space-y-5">{aside}</div>}
    </div>
  );
}

/** A titled card section used inside FormLayout columns. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5", className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
