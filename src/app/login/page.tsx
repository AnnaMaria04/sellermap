"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Package, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/inventory";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push(next);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) router.push(next);
      else setInfo("Проверьте почту — мы отправили ссылку для подтверждения.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--c-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Package size={22} className="text-[var(--c-green)]" />
          <span className="text-lg font-semibold text-[var(--c-text)]">SellerMap</span>
        </div>

        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
          <h1 className="text-lg font-semibold text-[var(--c-text)]">
            {mode === "signin" ? "Вход" : "Регистрация"}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--c-text2)]">
            {mode === "signin" ? "Войдите в свой кабинет продавца" : "Создайте кабинет продавца"}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Пароль</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-[var(--c-red-dim)] px-3 py-2 text-xs text-[var(--c-red)]">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg bg-[var(--c-green-dim)] px-3 py-2 text-xs text-[var(--c-green)]">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] py-2.5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === "signin" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
            className="mt-4 w-full text-center text-xs text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            {mode === "signin" ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
