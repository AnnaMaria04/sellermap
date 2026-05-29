"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Cta {
  label: string;
  href?: string;
  onClick?: () => void;
}

/**
 * A primary/secondary setup card with a built-in done variant: once the
 * underlying data exists it goes muted, shows a ✓ and swaps its CTA to
 * «Изменить» — so the screen visibly fills in as setup progresses.
 */
export function SetupCard({
  icon,
  title,
  subtitle,
  done,
  primary,
  secondary,
  footer,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
  done?: boolean;
  primary: Cta;
  secondary?: Cta;
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-[var(--c-bg)] p-5 transition hover:shadow-[0_1px_12px_rgba(0,0,0,0.06)]",
        done ? "border-[var(--c-border)]" : "border-[var(--c-border2)]",
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              done ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-bg3)] text-[var(--c-text2)]",
            )}
          >
            {done ? <Check className="h-5 w-5" /> : icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--c-text)]">
            {title}
            {done && (
              <span className="rounded-full bg-[var(--c-green-dim)] px-2 py-0.5 text-xs font-medium text-[var(--c-green)]">
                Готово
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--c-text2)]">{subtitle}</p>
        </div>
      </div>

      {footer && <div className="mt-4">{footer}</div>}

      <div className="mt-auto flex items-center gap-3 pt-5">
        <CtaButton
          cta={done ? { label: "Изменить", href: primary.href, onClick: primary.onClick } : primary}
          variant={done ? "secondary" : "primary"}
        />
        {!done && secondary && <CtaButton cta={secondary} variant="text" />}
      </div>
    </div>
  );
}

function CtaButton({ cta, variant }: { cta: Cta; variant: "primary" | "secondary" | "text" }) {
  const cls = cn(
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition",
    variant === "primary" && "bg-[var(--c-text)] px-4 py-2 text-[var(--c-bg)] hover:opacity-90",
    variant === "secondary" && "border border-[var(--c-border2)] px-4 py-2 text-[var(--c-text)] hover:bg-[var(--c-bg2)]",
    variant === "text" && "px-1 py-2 text-[var(--c-text2)] underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]",
  );
  if (cta.href) return <Link href={cta.href} className={cls}>{cta.label}</Link>;
  return <button type="button" onClick={cta.onClick} className={cls}>{cta.label}</button>;
}
