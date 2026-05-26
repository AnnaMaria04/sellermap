"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User, Wrench } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  cashier: "Кассир",
  warehouse: "Склад",
};

function readCookie(name: string): string | null {
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(name + "="))
      ?.split("=")[1] ?? null
  );
}

export function AccountMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [devRole, setDevRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Developer bypass takes precedence — these sessions have no Supabase user.
    if (readCookie("sm_dev_bypass") === "1") {
      setDevRole(readCookie("sm_dev_role") ?? "owner");
      return;
    }
    const supabase = createClient();
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    setBusy(true);
    // Clear the developer-bypass cookies so a stale role (e.g. cashier) can't
    // keep redirecting the user away from inventory.
    document.cookie = "sm_dev_bypass=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "sm_dev_role=; path=/; max-age=0; SameSite=Lax";
    await createClient()?.auth.signOut();
    router.push("/login");
  }

  if (devRole) {
    return (
      <div className="border-t border-[var(--c-border)] p-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-green-dim)] text-[var(--c-green)]">
            <Wrench size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--c-text)]">Режим разработчика</p>
            <p className="truncate text-[11px] text-[var(--c-text3)]">{ROLE_LABELS[devRole] ?? devRole}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          disabled={busy}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] disabled:opacity-60"
        >
          <LogOut size={16} className="shrink-0" />
          Сменить роль / выйти
        </button>
      </div>
    );
  }

  if (!email) return null;

  return (
    <div className="border-t border-[var(--c-border)] p-3">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text2)]">
          <User size={14} />
        </div>
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--c-text2)]">{email}</span>
      </div>
      <button
        onClick={signOut}
        disabled={busy}
        className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] disabled:opacity-60"
      >
        <LogOut size={16} className="shrink-0" />
        Выйти
      </button>
    </div>
  );
}
