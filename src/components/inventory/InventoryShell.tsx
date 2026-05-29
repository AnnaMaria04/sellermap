"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { useInventory } from "@/contexts/InventoryContext";
import { computeAlerts } from "@/lib/inventory/alerts";
import { useDismissedAlerts } from "@/hooks/useDismissedAlerts";
import { useSeenAlerts } from "@/hooks/useSeenAlerts";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { moduleForRoute, type ModuleId } from "@/lib/modules/registry";
import {
  Package,
  BarChart3,
  Truck,
  Home,
  Settings,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  ShoppingBag,
  Wallet,
  Users,
  Building2,
  Map,
  ShoppingCart,
  Store,
  Calculator,
  Megaphone,
  Boxes,
  FileCode,
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

// Primary nav — a shallow, Shopify-admin structure. Six core items up top;
// the "Каналы продаж" and "Склад и закупки" sections appear only when their
// modules are enabled for the seller's segment (progressive disclosure). Rare
// actions live as children of a relevant parent rather than top-level.
const NAV: NavSection[] = [
  {
    items: [
      { label: "Главная", href: "/inventory", icon: Home },
      {
        label: "Заказы", href: "/inventory/orders", icon: ShoppingBag,
        children: [
          { label: "Черновики", href: "/inventory/orders/drafts" },
          { label: "Возвраты", href: "/inventory/returns" },
          { label: "Доставка", href: "/inventory/orders/shipping-labels" },
          { label: "Брошенные корзины", href: "/inventory/orders/abandoned" },
        ],
      },
      {
        label: "Товары", href: "/inventory/products", icon: Package,
        children: [
          { label: "Остатки", href: "/inventory/inventory" },
          { label: "Коллекции", href: "/inventory/products/collections" },
          { label: "Подарочные карты", href: "/inventory/products/gift-cards" },
          { label: "Маркировка", href: "/inventory/labeling" },
        ],
      },
      {
        label: "Клиенты", href: "/inventory/customers", icon: Users,
        children: [
          { label: "Сегменты", href: "/inventory/customers/segments" },
          { label: "Компании", href: "/inventory/customers/companies" },
        ],
      },
      {
        label: "Маркетинг", href: "/inventory/marketing", icon: Megaphone,
        children: [
          { label: "Кампании", href: "/inventory/marketing/campaigns" },
          { label: "Скидки", href: "/inventory/promotions" },
          { label: "Атрибуция", href: "/inventory/marketing/attribution" },
        ],
      },
      {
        label: "Аналитика", href: "/inventory/analytics", icon: BarChart3,
        children: [
          { label: "Отчёты", href: "/inventory/analytics/reports" },
          { label: "В реальном времени", href: "/inventory/analytics/live" },
          { label: "История", href: "/inventory/history" },
        ],
      },
    ],
  },
  {
    title: "Каналы продаж",
    items: [
      { label: "Витрина", href: "/inventory/storefront", icon: Store },
      {
        label: "Маркетплейсы", href: "/inventory/integrations", icon: ShoppingCart,
        children: [
          { label: "Отзывы", href: "/inventory/feedbacks" },
          { label: "Синхронизация", href: "/inventory/sync-health" },
        ],
      },
      { label: "Касса (POS)", href: "/pos", icon: Calculator },
    ],
  },
  {
    title: "Склад и закупки",
    items: [
      {
        label: "Склады", href: "/inventory/locations", icon: Building2,
        children: [
          { label: "Перемещения", href: "/inventory/transfers" },
          { label: "Инвентаризация", href: "/inventory/stocktake" },
          { label: "Поставщики", href: "/inventory/suppliers" },
          { label: "Резервы", href: "/inventory/reservations" },
        ],
      },
      { label: "Закупки", href: "/inventory/purchase-orders", icon: Truck },
      { label: "Производство", href: "/inventory/bundles", icon: Boxes },
      { label: "Обмен с 1С", href: "/inventory/erp1c", icon: FileCode },
    ],
  },
  {
    title: "Финансы",
    items: [
      {
        label: "Финансы", href: "/inventory/finance", icon: Wallet,
        children: [
          { label: "Налоги", href: "/inventory/tax" },
          { label: "Бухгалтерские отчёты", href: "/inventory/reports" },
        ],
      },
    ],
  },
];

// Footer items (settings-level, kept small). Интеграции/Персонал live inside
// Настройки to keep the main nav focused on day-to-day work.
const FOOTER_LINKS = [
  { label: "Настройки",  href: "/inventory/settings",      icon: Settings },
];

const BOTTOM_TABS = [
  { icon: Home,       label: "Обзор",    href: "/inventory" as string | null },
  { icon: Package,    label: "Товары",   href: "/inventory/products" as string | null },
  { icon: ShoppingBag,label: "Заказы",   href: "/inventory/orders" as string | null },
  { icon: Users,      label: "Клиенты",  href: "/inventory/customers" as string | null },
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

/** A nav href is visible when its owning module is enabled (or it owns no
 *  gated module). `enabled === null` (loading / gating off) → show everything. */
function navVisible(href: string, enabled: Set<ModuleId> | null) {
  if (!enabled) return true;
  const m = moduleForRoute(href);
  return m === null || enabled.has(m);
}

/** Filter the NAV tree down to the seller's enabled modules, dropping empty
 *  parents and sections. Nothing is removed from the app — just hidden here. */
function filterNav(enabled: Set<ModuleId> | null): NavSection[] {
  if (!enabled) return NAV;
  return NAV
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((c) => navVisible(c.href, enabled)),
        }))
        .filter((item) => navVisible(item.href, enabled) || (item.children?.length ?? 0) > 0),
    }))
    .filter((section) => section.items.length > 0);
}

// ── NavList ───────────────────────────────────────────────────────────────────

function NavList({ pathname, onNavigate, enabled }: { pathname: string; onNavigate?: () => void; enabled: Set<ModuleId> | null }) {
  // Manual expand/collapse override per parent href. undefined = follow active
  // state; true/false = user toggled. Clicking an expanded parent collapses it.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const sections = filterNav(enabled);

  return (
    <nav className="py-3">
      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <p className="mx-3 mb-0.5 mt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--c-text3)]">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const groupOn   = isGroupActive(item, pathname);
            const selfOn    = isActive(pathname, item.href);
            const hasKids   = !!item.children && item.children.length > 0;
            const expanded  = overrides[item.href] ?? groupOn;
            const showKids  = hasKids && expanded;

            return (
              <div key={item.href}>
                {/* Parent link — navigates and (when it has children) toggles
                    the submenu: a second click on an open parent collapses it. */}
                <Link
                  href={item.href}
                  onClick={() => {
                    if (hasKids) setOverrides((o) => ({ ...o, [item.href]: !expanded }));
                    onNavigate?.();
                  }}
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

                {/* Children — visible when expanded */}
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
  const { products, batches, purchaseOrders } = useInventory();
  const { dismissed }         = useDismissedAlerts();
  const { seen }              = useSeenAlerts();
  const { theme, toggle }     = useTheme();
  const unread = computeAlerts(products, batches, purchaseOrders)
    .filter((a) => !dismissed.has(a.id) && !seen.has(a.id)).length;

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
  const { enabled }  = useEnabledModules();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allItems = NAV.flatMap((s) => s.items.flatMap((i) => [i, ...(i.children ?? [])]));
  const currentLabel = allItems.find((i) => isActive(pathname, i.href))?.label ?? "Меню";

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">

      {/* ── Desktop sidebar (fixed, full height — owns the logo row) ── */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-56 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] lg:flex">
        {/* Brand / logo row */}
        <Link
          href="/"
          className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--c-border)] px-4 transition hover:bg-[var(--c-bg3)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
            <Map size={18} />
          </span>
          <span className="font-display text-sm font-semibold text-[var(--c-text)]">
            Seller<span className="text-[var(--c-green)]">Map</span>
          </span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} enabled={enabled} />
        </div>
        <SidebarFooter pathname={pathname} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
                  <Map size={15} />
                </span>
                <span className="font-display text-sm font-semibold text-[var(--c-text)]">
                  Seller<span className="text-[var(--c-green)]">Map</span>
                </span>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList pathname={pathname} enabled={enabled} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <SidebarFooter pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="lg:pl-56">
        {/* Mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-4 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Menu size={18} />
          </button>
          {/* Logo in centre */}
          <Link href="/" className="flex flex-1 items-center justify-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
              <Map size={14} />
            </span>
            <span className="font-display text-sm font-semibold text-[var(--c-text)]">
              Seller<span className="text-[var(--c-green)]">Map</span>
            </span>
          </Link>
          {/* Spacer to keep logo centred */}
          <div className="h-9 w-9 shrink-0" />
        </div>

        {/* Page header */}
        {(title || actions) && (
          <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-6 py-5 lg:px-8">
              <div className="min-w-0">
                {title    && <h1 className="truncate text-lg font-semibold text-[var(--c-text)]">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-[var(--c-text2)]">{subtitle}</p>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}

        <main className="overflow-x-hidden pb-20 lg:pb-10">
          <div className="mx-auto w-full max-w-[1180px] px-6 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--c-border)] bg-[var(--c-bg2)] lg:hidden">
        {BOTTOM_TABS.filter((t) => t.href === null || navVisible(t.href, enabled)).map(({ icon: Icon, label, href }) => {
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
