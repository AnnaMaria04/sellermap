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
  BarChart3,
  History,
  Truck,
  Home,
  Settings,
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
  Building2,
  ClipboardList,
  RotateCcw,
  FileText,
} from "lucide-react";

// ── Nav data ──────────────────────────────────────────────────────────────────

type NavChild = { label: string; href: string };

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  // Children auto-show when parent or any child path is active (Shopify pattern)
  children?: NavChild[];
};

type NavSection = { title?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { label: "Обзор",    href: "/inventory",             icon: Home },
      { label: "Заказы",   href: "/inventory/orders",      icon: ShoppingBag },
      {
        label: "Товары",   href: "/inventory/products",    icon: Package,
        children: [{ label: "Комплекты", href: "/inventory/bundles" }],
      },
      {
        label: "Клиенты",  href: "/inventory/customers",   icon: Users,
        children: [{ label: "Акции и промо", href: "/inventory/promotions" }],
      },
    ],
  },
  {
    title: "Операции",
    items: [
      {
        label: "Закупки",        href: "/inventory/purchase-orders", icon: Truck,
        children: [{ label: "Поставщики", href: "/inventory/suppliers" }],
      },
      { label: "Перемещения",    href: "/inventory/transfers",       icon: ArrowLeftRight },
      { label: "Инвентаризация", href: "/inventory/stocktake",       icon: ClipboardList },
      { label: "Возвраты",       href: "/inventory/returns",         icon: RotateCcw },
      { label: "История",        href: "/inventory/history",         icon: History },
    ],
  },
  {
    title: "Финансы",
    items: [
      { label: "Финансы",   href: "/inventory/finance",    icon: Wallet },
      { label: "Аналитика", href: "/inventory/analytics",  icon: BarChart3 },
      { label: "Отчёты",    href: "/inventory/reports",    icon: FileText },
    ],
  },
];

// Footer items (settings-level, kept small)
const FOOTER_LINKS = [
  { label: "Интеграции", href: "/inventory/integrations", icon: Plug },
  { label: "Персонал",   href: "/inventory/staff",         icon: Users2 },
  { label: "Настройки",  href: "/inventory/settings",      icon: Settings },
];

const BOTTOM_TABS = [
  { icon: Home,       label: "Обзор",    href: "/inventory" as string | null },
  { icon: Package,    label: "Товары",   href: "/inventory/products" as string | null },
  { icon: ShoppingBag,label: "Заказы",   href: "/inventory/orders" as string | null },
  { icon: Truck,      label: "Закупки",  href: "/inventory/purchase-orders" as string | null },
  { icon: Menu,       label: "Ещё",      href: null as string | null },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string) {
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(href + "/");
}

/** True when this item OR any of its children matches the current path */
function isGroupActive(item: NavItem, pathname: string) {
  if (isActive(pathname, item.href)) return true;
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

// ── NavList ───────────────────────────────────────────────────────────────────

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="py-3">
      {NAV.map((section, si) => (
        <div key={si}>
          {section.title && (
            <p className="mx-3 mb-0.5 mt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--c-text3)]">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const groupOn   = isGroupActive(item, pathname);
            const selfOn    = isActive(pathname, item.href);
            const showKids  = groupOn && item.children && item.children.length > 0;

            return (
              <div key={item.href}>
                {/* Parent link — always navigates */}
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg mx-2 px-3 py-2 text-sm transition",
                    selfOn
                      ? "bg-[var(--c-bg3)] font-semibold text-[var(--c-text)]"
                      : groupOn
                      ? "font-medium text-[var(--c-text)]"
                      : "font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                  )}
                >
                  <item.icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>

                {/* Children — auto-visible when group is active (Shopify pattern) */}
                {showKids && (
                  <div className="mx-2 mb-1 ml-8 border-l border-[var(--c-border)] pl-3 space-y-0.5">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-2.5 py-1.5 text-sm transition",
                          isActive(pathname, child.href)
                            ? "bg-[var(--c-bg3)] font-medium text-[var(--c-text)]"
                            : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── SidebarFooter ─────────────────────────────────────────────────────────────

function SidebarFooter({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { products, batches } = useInventory();
  const { dismissed }         = useDismissedAlerts();
  const { theme, toggle }     = useTheme();
  const unread = computeAlerts(products, batches).filter((a) => !dismissed.has(a.id)).length;

  return (
    <div className="border-t border-[var(--c-border)] px-2 pb-2 pt-2 space-y-0.5">
      {/* Settings-level links (small) */}
      {FOOTER_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition",
            isActive(pathname, l.href)
              ? "bg-[var(--c-bg3)] font-medium text-[var(--c-text)]"
              : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
          )}
        >
          <l.icon size={15} className="shrink-0" />
          <span className="truncate">{l.label}</span>
        </Link>
      ))}

      <div className="flex items-center gap-1 pt-1">
        <Link
          href="/inventory/notifications"
          className="relative flex flex-1 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
        >
          <Bell size={15} className="shrink-0" />
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
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <AccountMenu />
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function InventoryShell({ children, title, subtitle, actions }: Props) {
  const pathname     = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allItems = NAV.flatMap((s) => s.items.flatMap((i) => [i, ...(i.children ?? [])]));
  const currentLabel = allItems.find((i) => isActive(pathname, i.href))?.label ?? "Меню";

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">

      {/* ── Desktop sidebar (fixed to left edge) ── */}
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-56 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <SidebarFooter pathname={pathname} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--c-text)]">Меню</span>
              <button onClick={() => setDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <SidebarFooter pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="lg:pl-56">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 py-2 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
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
                {title    && <h1 className="truncate text-lg font-semibold text-[var(--c-text)]">{title}</h1>}
                {subtitle && <p className="mt-0.5 text-sm text-[var(--c-text2)]">{subtitle}</p>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}

        <main className="overflow-x-hidden px-6 py-6 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--c-border)] bg-[var(--c-bg2)] lg:hidden">
        {BOTTOM_TABS.map(({ icon: Icon, label, href }) => {
          const active = href !== null && isActive(pathname, href);
          if (href === null) {
            return (
              <button key={label} onClick={() => setDrawerOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
              >
                <Icon size={20} /><span>{label}</span>
              </button>
            );
          }
          return (
            <Link key={label} href={href as string}
              className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-[var(--c-green)]" : "text-[var(--c-text3)] hover:text-[var(--c-text)]")}
            >
              <Icon size={20} /><span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
