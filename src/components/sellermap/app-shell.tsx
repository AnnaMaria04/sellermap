"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = [
    ["Проверка товара", "/check"],
    ...(pathname.startsWith("/result") ? ([["Отчёт", pathname]] as const) : []),
    ["Дашборд", "/dashboard"],
    ["Отчёты", "/reports"],
    ["Обновления", "/updates"],
  ];

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--c-border)] backdrop-blur-xl"
        style={{ height: "var(--nav-h)", background: "rgba(8,8,22,0.92)" }}
      >
        <div className="mx-auto flex h-full max-w-[1060px] items-center px-7">
          {/* Logo */}
          <Link href="/" className="mr-7 flex items-center gap-2 shrink-0">
            <div
              className="flex items-center justify-center rounded-[7px]"
              style={{ width: 26, height: 26, background: "var(--c-green)" }}
            >
              <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                <path d="M1 10L6.5 1L12 10H1Z" fill="white" fillOpacity=".92" />
              </svg>
            </div>
            <span
              className="font-display"
              style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-.02em" }}
            >
              SellerMap
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden flex-1 items-center gap-0.5 md:flex overflow-hidden">
            {nav.map(([label, href]) => {
              const active = pathname === href || (href === pathname && pathname.startsWith("/result"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-[5px] px-3 py-[5px] text-[13px] transition-all whitespace-nowrap",
                    active
                      ? "bg-[var(--c-bg3)] font-semibold text-[var(--c-text)]"
                      : "font-normal text-[var(--c-text2)] hover:bg-[var(--c-bg2)] hover:text-[var(--c-text)]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <Link
            href="/check"
            className="ml-auto shrink-0 rounded-[5px] px-[14px] py-[7px] text-[13px] font-semibold text-[var(--c-bg)] transition hover:opacity-80"
            style={{ background: "var(--c-green)" }}
          >
            + Новый анализ
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
