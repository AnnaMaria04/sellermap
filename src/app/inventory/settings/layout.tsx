"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import {
  ArrowLeft,
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
      { label: "Локации",      href: "/inventory/locations",      icon: MapPin },
      { label: "Интеграции",   href: "/inventory/integrations",   icon: Plug },
    ],
  },
  {
    title: "Система",
    items: [
      { label: "Уведомления", href: "/inventory/notifications", icon: Bell },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Sidebar content (shared between desktop + mobile drawer) ──────────────────

function SidebarContent({
  pathname,
  profile,
  search,
  onSearch,
  onNavigate,
}: {
  pathname: string;
  profile: { company?: string; businessType?: string };
  search: string;
  onSearch: (v: string) => void;
  onNavigate?: () => void;
}) {
  const companyName = profile.company || "Моя компания";
  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || companyName.slice(0, 2).toUpperCase();

  const filtered = search.trim()
    ? [{ items: ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(search.toLowerCase())) }]
    : NAV_GROUPS;

  return (
    <>
      {/* Company badge */}
      <div className="border-b border-[var(--c-border)] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--c-green)] text-[var(--c-bg)] text-sm font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--c-text)]">{companyName}</p>
            <p className="truncate text-xs text-[var(--c-text3)]">{profile.businessType || "SellerMap"}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-[var(--c-border)] px-3 py-2.5">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск настроек"
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] py-1.5 pl-7 pr-3 text-xs text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filtered.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-2" : ""}>
            {"title" in group && group.title && (
              <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text3)]">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
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
        ))}
        {search.trim() && filtered[0]?.items.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-[var(--c-text3)]">Ничего не найдено</p>
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

  return (
    <div className="fixed inset-0 z-40 flex bg-[var(--c-bg)]">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-[var(--c-border)] bg-[var(--c-bg2)]">
        {/* Back header */}
        <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-3.5">
          <Link
            href="/inventory"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
            title="Назад"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-semibold text-[var(--c-text)]">Настройки</span>
        </div>

        <SidebarContent
          pathname={pathname}
          profile={profile}
          search={search}
          onSearch={setSearch}
        />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
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
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Link href="/inventory" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] transition">
              <ArrowLeft size={16} />
            </Link>
            <span className="text-sm font-semibold text-[var(--c-text)]">Настройки</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={16} />
          </button>
        </div>
        <SidebarContent
          pathname={pathname}
          profile={profile}
          search={search}
          onSearch={setSearch}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-2.5 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-[var(--c-text)]">
            {ALL_ITEMS.find((i) => isActive(pathname, i.href, i.exact))?.label ?? "Настройки"}
          </span>
          <Link href="/inventory" className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            <X size={16} />
          </Link>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-6 pb-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
