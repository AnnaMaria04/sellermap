"use client";

import Link from "next/link";
import { Map, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  ["Анализ WB", "/check"],
  ["Склад", "/inventory"],
  ["Касса", "/pos"],
  ["Каталог", "/catalog"],
  ["Финансы", "/finance"],
  ["Обновления", "/updates"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/pos");
  const [menuOpen, setMenuOpen] = useState(false);

  if (isPOS) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-header)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-sm font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
              <Map size={20} />
            </span>
            <span>
              Seller<span className="text-[var(--c-green)]">Map</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                  (pathname === href || (href !== "/" && pathname.startsWith(href))) && "bg-[var(--c-bg3)] text-[var(--c-text)]",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop action buttons */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/pos"
              className="flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
            >
              <ShoppingCart size={15} />
              Касса
            </Link>
            <LinkButton href="/check" className="h-10 px-4">
              <Search size={16} />
              Анализ
            </LinkButton>
          </div>

          {/* Mobile: Касса shortcut + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/pos"
              className="flex h-10 items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 text-sm font-semibold text-[var(--c-bg)]"
            >
              <ShoppingCart size={14} />
              Касса
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)]"
              aria-label="Открыть меню"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-[var(--c-bg2)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-4">
              <span className="text-sm font-semibold text-[var(--c-text)]">Меню</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)]"
                aria-label="Закрыть меню"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="px-2 py-3 space-y-1">
              {nav.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg px-4 py-3 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition",
                    (pathname === href || (href !== "/" && pathname.startsWith(href))) && "bg-[var(--c-bg3)] text-[var(--c-text)]",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
