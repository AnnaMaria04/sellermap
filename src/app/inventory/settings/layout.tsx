"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import {
  Users2,
  MonitorSmartphone,
  MapPin,
  Bell,
  CreditCard,
  Plug,
  Settings,
  Search,
  Menu,
  X,
} from "lucide-react";

// ── Nav data ──────────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: React.ElementType; exact?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Общие", href: "/inventory/settings", icon: Settings, exact: true },
    ],
  },
  {
    title: "Команда",
    items: [
      { label: "Персонал",  href: "/inventory/settings/staff",   icon: Users2 },
      { label: "Биллинг",   href: "/inventory/settings/billing", icon: CreditCard },
    ],
  },
  {
    title: "Продажи",
    items: [
      { label: "Касса (POS)",  href: "/inventory/settings/pos",  icon: MonitorSmartphone },
      { label: "Локации",      href: "/inventory/locations",     icon: MapPin },
      { label: "Интеграции",   href: "/inventory/settings/integrations", icon: Plug },
    ],
  },
  {
    title: "Система",
    items: [
      { label: "Уведомления", href: "/inventory/notifications", icon: Bell },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Sidebar nav list ──────────────────────────────────────────────────────────

function SidebarNav({
  pathname,
  search,
  onSearch,
  onNavigate,
}: {
  pathname: string;
  search: string;
  onSearch: (v: string) => void;
  onNavigate?: () => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered: NavGroup[] = q
    ? [{ items: ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q)) }]
    : NAV_GROUPS;

  return (
    <>
      {/* Search */}
      <div className="border-b border-[var(--c-border)] px-3 py-2.5">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск настроек"
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] py-1.5 pl-7 pr-7 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            {group.title && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-[var(--c-bg3)] font-semibold text-[var(--c-text)]"
                        : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                    )}
                  >
                    <item.icon size={15} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {q && filtered[0]?.items.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-[var(--c-text3)]">
            Ничего не найдено
          </p>
        )}
      </nav>
    </>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useSellerProfile();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Clear search whenever the active settings page changes
  useEffect(() => { setSearch(""); setMobileOpen(false); }, [pathname]);

  const companyName = profile.company || "Моя компания";
  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || companyName.slice(0, 2).toUpperCase();
  const subtitle = profile.businessType || "SellerMap";

  // Store card shown at top of sidebar — matches Shopify pattern
  const StoreCard = () => (
    <div className="shrink-0 border-b border-[var(--c-border)] px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--c-green)] text-[var(--c-bg)] text-sm font-bold">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--c-text)]">{companyName}</p>
          <p className="truncate text-xs text-[var(--c-text3)]">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex bg-[var(--c-bg)]">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
        <StoreCard />
        <SidebarNav pathname={pathname} search={search} onSearch={setSearch} />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)] transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <StoreCard />
        <SidebarNav
          pathname={pathname}
          search={search}
          onSearch={setSearch}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — mobile: hamburger + title; desktop: just the × close in the corner */}
        <div className="flex h-14 shrink-0 items-center border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition md:hidden"
          >
            <Menu size={18} />
          </button>

          {/* Page title (derived from active nav item) */}
          <span className="ml-3 text-sm font-semibold text-[var(--c-text)] md:ml-0">
            {ALL_ITEMS.find((i) => isActive(pathname, i.href, i.exact))?.label ?? "Настройки"}
          </span>

          {/* × Close — right side, both mobile and desktop (Shopify pattern) */}
          <Link
            href="/inventory"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
            title="Закрыть настройки"
          >
            <X size={18} />
          </Link>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 pb-12 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
