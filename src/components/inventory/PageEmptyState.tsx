"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shopify-style empty state: a friendly illustration, a heading, a nudge to
 * add the first item, a primary action and a "learn more" link below the card.
 */
export function PageEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  learnMore,
  illustration,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  learnMore?: string;
  illustration?: ReactNode;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          {illustration ?? <DocIllustration />}
          <h2 className="mt-6 text-lg font-semibold text-[var(--c-text)]">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text2)]">{description}</p>
          {actionLabel && (
            <div className="mt-5">
              {actionHref ? (
                <Link
                  href={actionHref}
                  className="inline-flex rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90"
                >
                  {actionLabel}
                </Link>
              ) : (
                <button
                  onClick={onAction}
                  className="inline-flex rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90"
                >
                  {actionLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {learnMore && (
        <p className="mt-5 text-center text-sm text-[var(--c-text2)]">
          <a className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]" href="#">
            {learnMore}
          </a>
        </p>
      )}
    </div>
  );
}

/** Built-in document illustration echoing the reference empty state. */
function DocIllustration() {
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" fill="none" aria-hidden>
      <circle cx="66" cy="66" r="60" fill="var(--c-bg3)" />
      <path d="M44 30h32l16 16v50a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4Z" fill="var(--c-bg)" stroke="var(--c-border2)" strokeWidth="2" />
      <path d="M76 30v12a4 4 0 0 0 4 4h12" fill="none" stroke="var(--c-border2)" strokeWidth="2" />
      <rect x="50" y="44" width="16" height="6" rx="3" fill="#3b82f6" />
      <circle cx="58" cy="66" r="9" fill="#14b8a6" opacity="0.85" />
      <rect x="72" y="62" width="14" height="4" rx="2" fill="var(--c-border2)" />
      <rect x="72" y="70" width="10" height="4" rx="2" fill="var(--c-border2)" />
      <path d="M52 84l5 5 7-9" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 96h52v0a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8Z" fill="#14b8a6" opacity="0.85" />
    </svg>
  );
}
