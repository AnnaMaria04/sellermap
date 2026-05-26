"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { useInventory } from "@/contexts/InventoryContext";
import { computeAlerts } from "@/lib/inventory/alerts";
import { useDismissedAlerts } from "@/hooks/useDismissedAlerts";
import { useTheme } from "@/components/ui/ThemeProvider";
import {
  Package,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  History,
  Truck,
  Home,
  RotateCcw,
  Layers,
  Settings,
  FileText,
  Plug,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  ShoppingBag,
  Wallet,
  Users,
  Users2,
  Tag,
  Building2,
  ChevronDown,
  Package2,
} from "lucide-react";

type NavChild = { label: string; href: string };
type NavSection = {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: NavChild[];
};

const NAV: NavSection[] = [
  { label: "Обзор", href: "/inventory", icon: Home },
  {
    label: "Заказы",
    icon: ShoppingBag,
    href: "/inventory/orders",
    children: [
      { label: "Все заказы", href: "/inventory/orders" },
      { label: "Клиенты", href: "/inventory/customers" },
      { label: "Акции", href: "/inventory/promotions" },
    ],
  },
  {
    label: "Товары",
    icon: Package,
    href: "/inventory/products",
    children: [
      { label: "Все товары", href: "/inventory/products" },
      { label: "Комплекты", href: "/inventory/bundles" },
    ],
  },
  {
    label: "Склад",
    icon: Package2,
    children: [
      { label: "Закупки", href: "/inventory/purchase-orders" },
      { label: "Поставщики", href: "/inventory/suppliers" },
      { label: "Перемещения", href: "/inventory/transfers" },
      { label: "Инвентаризация", href: "/inventory/stocktake" },
      { label: "Возвраты", href: "/inventory/returns" },
      { label: "История", href: "/inventory/history" },
    ],
  },
  {
    label: "Финансы",
    icon: Wallet,
    children: [
      { label: "Финансы", href: "/inventory/finance" },
      { label: "Аналитика", href: "/inventory/analytics" },
      { label: "Отчёты", href: "/inventory/reports" },
    ],
  },
  {
    label: "Система",
    icon: Settings,
    children: [
      { label: "Интеграции", href: "/inventory/integrations" },
      { label: "Персонал", href: "/inventory/staff" },
      { label: "Настройки", href: "/inventory/settings" },
    ],
  },
];

const BOTTOM_TABS = [
  { icon: Home, label: "Обзор", href: "/inventory" as string | null },
  { icon: Package, label: "Товары", href: "/inventory/products" as string | null },
  { icon: ShoppingBag, label: "Заказы", href: "/inventory/orders" as string | null },
  { icon: Truck, label: "Закупки", href: "/inventory/purchase-orders" as string | null },
  { icon: Menu, label: "Ещё", href: null as string | null },
] as const;

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(href + "/");
}

function isGroupActive(section: NavSection, pathname: string): boolean {
  if (section.href && isItemActive(pathname, section.href)) return true;
  return section.children?.some((c) => isItemActive(pathname, c.href)) ?? false;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    NAV.forEach((section) => {
      if (section.children && isGroupActive(section, pathname)) s.add(section.label);
    });
    return s;
  });

  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  return (
    <nav className="px-2 py-3 space-y-0.5">
      {NAV.map((section) => {
        const groupActive = isGroupActive(section, pathname);
        const isOpen = expanded.has(section.label);

        if (!section.children) {
          return (
            <Link
              key={section.label}
              href={section.href!}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                groupActive
                  ? "bg-[var(--c-bg3)] font-semibold text-[var(--c-text)]"
                  : "font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
              )}
            >
              <section.icon size={16} className="shrink-0" />
              <span className="truncate">{section.label}</span>
            </Link>
          );
        }

        return (
          <div key={section.label}>
            <button
              onClick={() => toggle(section.label)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                groupActive
                  ? "text-[var(--c-text)]"
                  : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
              )}
            >
              <section.icon size={16} className="shrink-0" />
              <span className="flex-1 text-left truncate">{section.label}</span>
              <ChevronDown
                size={13}
                className={cn(
                  "shrink-0 text-[var(--c-text3)] transition-transform duration-150",
                  isOpen ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>

            {isOpen && (
              <div className="ml-4 mt-0.5 mb-1 border-l border-[var(--c-border)] pl-3 space-y-0.5">
                {section.children.map((child) => {
                  const active = isItemActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-sm transition",
                        active
                          ? "bg-[var(--c-bg3)] font-medium text-[var(--c-text)]"
                          : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { products, batches } = useInventory();
  const { dismissed } = useDismissedAlerts();
  const { theme, toggle } = useTheme();
  const unread = computeAlerts(products, batches).filter((a) => !dismissed.has(a.id)).length;

  return (
    <div className="border-t border-[var(--c-border)] px-2 pb-2 pt-2 space-y-0.5">
      <div className="flex items-center gap-1">
        <Link
          href="/inventory/notifications"
          className="relative flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
        >
          <Bell size={16} className="shrink-0" />
          <span className="truncate">Уведомления</span>
          {unread > 0 && (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--c-red)] px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
      <AccountMenu />
    </div>
  );
}

export function InventoryShell({ children, title, subtitle, actions }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allChildren = NAV.flatMap((s) =>
    s.children ? s.children : s.href ? [{ label: s.label, href: s.href }] : [],
  );
  const currentLabel = allChildren.find((i) => isItemActive(pathname, i.href))?.label ?? "Склад";

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* Fixed sidebar — pinned to left edge of viewport */}
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-56 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--c-text)]">Меню</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
            <AccountMenu />
          </aside>
        </div>
      )}

      {/* Main content — offset by fixed sidebar */}
      <div className="lg:pl-56">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 py-2 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Menu size={20} />
          </button>
          <span className="truncate text-sm font-semibold text-[var(--c-text)]">{currentLabel}</span>
        </div>

        {/* Page header */}
        {(title || actions) && (
          <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                {title && <h1 className="truncate text-lg font-semibold text-[var(--c-text)]">{title}</h1>}
                {subtitle && <p className="mt-0.5 text-sm text-[var(--c-text2)]">{subtitle}</p>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}

        <main className="overflow-x-hidden px-6 py-6 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--c-border)] bg-[var(--c-bg2)] lg:hidden">
        {BOTTOM_TABS.map(({ icon: Icon, label, href }) => {
          const isActive = href !== null && isItemActive(pathname, href);
          if (href === null) {
            return (
              <button
                key={label}
                onClick={() => setMobileOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            );
          }
          return (
            <Link
              key={label}
              href={href as string}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                isActive ? "text-[var(--c-green)]" : "text-[var(--c-text3)] hover:text-[var(--c-text)]",
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
