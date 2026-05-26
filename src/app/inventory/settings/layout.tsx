"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users2,
  MonitorSmartphone,
  MapPin,
  Bell,
  CreditCard,
} from "lucide-react";

const SETTINGS_NAV = [
  { label: "Основное",   href: "/inventory/settings",             icon: Building2,        exact: true },
  { label: "Персонал",   href: "/inventory/settings/staff",       icon: Users2 },
  { label: "Касса",      href: "/inventory/settings/pos",         icon: MonitorSmartphone },
  { label: "Локации",    href: "/inventory/locations",            icon: MapPin },
  { label: "Уведомления",href: "/inventory/notifications",        icon: Bell },
  { label: "Биллинг",    href: "/inventory/settings/billing",     icon: CreditCard },
] as const;

function isSettingsActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6 min-h-0">
      {/* Settings sub-nav */}
      <aside className="hidden lg:flex flex-col w-44 shrink-0">
        <nav className="space-y-0.5">
          {SETTINGS_NAV.map((item) => {
            const active = isSettingsActive(pathname, item.href, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-[var(--c-bg3)] font-medium text-[var(--c-text)]"
                    : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
                )}
              >
                <item.icon size={15} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile horizontal tabs */}
      <div className="lg:hidden -mx-6 mb-4 flex overflow-x-auto border-b border-[var(--c-border)] px-6 gap-1">
        {SETTINGS_NAV.map((item) => {
          const active = isSettingsActive(pathname, item.href, "exact" in item ? item.exact : false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-[var(--c-green)] text-[var(--c-text)]"
                  : "border-transparent text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
