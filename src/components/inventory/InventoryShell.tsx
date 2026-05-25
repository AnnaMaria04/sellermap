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
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  History,
  Truck,
  Home,
  RotateCcw,
  MapPin,
  Layers,
  Settings,
  FileText,
  Plug,
  Bell,
  Lock,
  Menu,
  X,
  ScanLine,
  Sun,
  Moon,
  ShoppingBag,
  Wallet,
  Users,
  Users2,
  Tag,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { title: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ label: "Обзор", href: "/inventory", icon: Home }],
  },
  {
    title: "Продажи",
    items: [
      { label: "Заказы", href: "/inventory/orders", icon: ShoppingBag },
      { label: "Клиенты", href: "/inventory/customers", icon: Users },
      { label: "Акции", href: "/inventory/promotions", icon: Tag },
    ],
  },
  {
    title: "Каталог",
    items: [
      { label: "Товары", href: "/inventory/products", icon: Package },
      { label: "Комплекты", href: "/inventory/bundles", icon: Layers },
      { label: "Маркировка", href: "/inventory/labeling", icon: ScanLine },
    ],
  },
  {
    title: "Склад",
    items: [
      { label: "Резервы", href: "/inventory/reservations", icon: Lock },
      { label: "Перемещения", href: "/inventory/transfers", icon: ArrowLeftRight },
      { label: "Инвентаризация", href: "/inventory/stocktake", icon: ClipboardList },
      { label: "Возвраты", href: "/inventory/returns", icon: RotateCcw },
      { label: "Локации", href: "/inventory/locations", icon: MapPin },
      { label: "История", href: "/inventory/history", icon: History },
    ],
  },
  {
    title: "Закупки",
    items: [
      { label: "Заказы поставщикам", href: "/inventory/purchase-orders", icon: ShoppingCart },
      { label: "Поставщики", href: "/inventory/suppliers", icon: Truck },
    ],
  },
  {
    title: "Аналитика",
    items: [
      { label: "Финансы", href: "/inventory/finance", icon: Wallet },
      { label: "Аналитика", href: "/inventory/analytics", icon: BarChart3 },
      { label: "Отчёты", href: "/inventory/reports", icon: FileText },
    ],
  },
  {
    title: "Система",
    items: [
      { label: "Интеграции", href: "/inventory/integrations", icon: Plug },
      { label: "Персонал", href: "/inventory/staff", icon: Users2 },
      { label: "Настройки", href: "/inventory/settings", icon: Settings },
    ],
  },
  {
    title: "Анализ WB",
    items: [
      { label: "Проверить товар", href: "/check", icon: BarChart3 },
      { label: "Отчёты", href: "/reports", icon: FileText },
      { label: "Обновления", href: "/updates", icon: Bell },
    ],
  },
];

const BOTTOM_TABS = [
  { icon: Home, label: "Обзор", href: "/inventory" as string | null },
  { icon: Package, label: "Товары", href: "/inventory/products" as string | null },
  { icon: ShoppingCart, label: "Касса", href: "/pos" as string | null },
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

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.title ?? `g-${gi}`} className="flex flex-col gap-0.5">
          {group.title && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--c-text3)]">
              {group.title}
            </p>
          )}
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = isItemActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                    : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { products, batches } = useInventory();
  const { dismissed } = useDismissedAlerts();
  const { theme, toggle } = useTheme();
  const unread = computeAlerts(products, batches).filter((a) => !dismissed.has(a.id)).length;

  return (
    <div className="border-t border-[var(--c-border)] px-3 pb-1 pt-2 space-y-0.5">
      <div className="flex items-center gap-1 px-1">
        <Link
          href="/inventory/notifications"
          className="relative flex flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
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

  const currentLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => isItemActive(pathname, i.href))?.label ?? "Склад";

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavList pathname={pathname} />
          </div>
          <SidebarFooter />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)]">
                <span className="text-sm font-semibold text-[var(--c-text)]">Меню склада</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
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

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Mobile nav trigger */}
          <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 py-2 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-[var(--c-text)] truncate">{currentLabel}</span>
          </div>

          {/* Page header */}
          {(title || actions) && (
            <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
              <div className="px-4 py-5 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {title && <h1 className="text-xl font-semibold text-[var(--c-text)] truncate">{title}</h1>}
                    {subtitle && <p className="mt-0.5 text-sm text-[var(--c-text2)]">{subtitle}</p>}
                  </div>
                  {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <main className="overflow-x-hidden px-4 py-6 pb-16 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
        </div>
      </div>

      {/* Bottom tab bar — fixed, only shown at <768px */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--c-border)] bg-[var(--c-bg2)] lg:hidden">
        {BOTTOM_TABS.map(({ icon: Icon, label, href }) => {
          const isActive = href !== null && isItemActive(pathname, href);
          const isMore = href === null;

          if (isMore) {
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
