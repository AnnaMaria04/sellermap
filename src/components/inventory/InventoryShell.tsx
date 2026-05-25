"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  History,
  Truck,
  Home,
} from "lucide-react";

const tabs = [
  { label: "Обзор",           href: "/inventory",               icon: Home },
  { label: "Товары",          href: "/inventory/products",      icon: Package },
  { label: "Заказы поставщикам", href: "/inventory/purchase-orders", icon: ShoppingCart },
  { label: "Перемещения",     href: "/inventory/transfers",     icon: ArrowLeftRight },
  { label: "Инвентаризация",  href: "/inventory/stocktake",     icon: ClipboardList },
  { label: "История",         href: "/inventory/history",       icon: History },
  { label: "Поставщики",      href: "/inventory/suppliers",     icon: Truck },
  { label: "Аналитика",       href: "/inventory/analytics",     icon: BarChart3 },
];

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function InventoryShell({ children, title, subtitle, actions }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* Sub-navigation */}
      <div className="border-b border-[var(--c-border)] bg-[var(--c-bg)] sticky top-16 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0 overflow-x-auto hide-scrollbar">
            {tabs.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/inventory" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition",
                    isActive
                      ? "border-[var(--c-green)] text-[var(--c-text)]"
                      : "border-transparent text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page header */}
      {(title || actions) && (
        <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-xl font-semibold text-[var(--c-text)]">{title}</h1>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-sm text-[var(--c-text2)]">{subtitle}</p>
                )}
              </div>
              {actions && (
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page body */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
