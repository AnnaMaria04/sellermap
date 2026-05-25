"use client";

import Link from "next/link";
import { Map, Search, ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  ["Анализ", "/check"],
  ["Склад", "/inventory"],
  ["Касса", "/pos"],
  ["Каталог", "/catalog"],
  ["Обновления", "/updates"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/pos");

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
          <div className="flex items-center gap-2">
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
        </div>
      </header>
      {children}
    </div>
  );
}
