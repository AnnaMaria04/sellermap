"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { moduleForRoute } from "@/lib/modules/registry";
import {
  Users2,
  MonitorSmartphone,
  MapPin,
  Bell,
  CreditCard,
  Plug,
  Settings,
  Search,
  SlidersHorizontal,
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
      { label: "Модули",      href: "/inventory/settings/modules", icon: SlidersHorizontal },
      { label: "Уведомления", href: "/inventory/notifications", icon: Bell },
    ],
  },
];


function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Settings sub-nav (in-content sidebar) ───────────────────────────────────────

function SettingsNav({ pathname }: { pathname: string }) {
  const { profile } = useSellerProfile();
  const { enabled } = useEnabledModules();
  const [search, setSearch] = useState("");
  const itemVisible = (href: string) => {
    if (!enabled) return true;
    const m = moduleForRoute(href);
    return m === null || enabled.has(m);
  };

  // Clear search whenever the active settings page changes
  useEffect(() => { setSearch(""); }, [pathname]);

  const companyName = profile.company || "Моя компания";
  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || companyName.slice(0, 2).toUpperCase();
  const subtitle = profile.businessType || "SellerMap";

  const q = search.trim().toLowerCase();
  // Hide settings tabs whose owning module is disabled (POS, Локации, Интеграции).
  const groups: NavGroup[] = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => itemVisible(i.href)) }))
    .filter((g) => g.items.length > 0);
  const filtered: NavGroup[] = q
    ? [{ items: groups.flatMap((g) => g.items).filter((i) => i.label.toLowerCase().includes(q)) }]
    : groups;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
      {/* Store card */}
      <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 py-4">
        <div
          title="Инициалы из названия компании. Измените его в «Общие настройки → Профиль компании»."
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--c-green)] text-[var(--c-bg)] text-sm font-bold"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--c-text)]">{companyName}</p>
          <p className="truncate text-xs text-[var(--c-text3)]">{subtitle}</p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-[var(--c-border)] px-3 py-2.5">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск настроек"
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] py-1.5 pl-7 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
      </div>

      {/* Nav groups */}
      <nav className="px-2 py-2">
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
          <p className="px-3 py-8 text-center text-sm text-[var(--c-text3)]">Ничего не найдено</p>
        )}
      </nav>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <InventoryShell title="Настройки" subtitle="Профиль, команда, каналы продаж и система">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <SettingsNav pathname={pathname} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </InventoryShell>
  );
}
