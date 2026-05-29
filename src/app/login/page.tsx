"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Package, AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  // Only allow same-origin relative paths as the post-login target (no
  // open-redirect to "//evil.com" or absolute URLs).
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/inventory";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // A full-page navigation (not router.push) so the request carries the freshly
  // set auth cookie and the middleware authenticates on the first try. A soft
  // client navigation could reuse an RSC payload rendered while logged-out and
  // bounce back to /login — the "click login ~10 times" bug.
  function go(to: string) {
    window.location.assign(to);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    if (!supabase) { setError("Supabase не настроен"); setBusy(false); return; }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setBusy(false); return; }
      go(next); // keep the spinner — the page is about to unload
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setBusy(false); return; }
      if (data.session) { go(next); return; }
      setInfo("Проверьте почту — мы отправили ссылку для подтверждения.");
      setBusy(false);
    }
  }

  function fillTest() {
    setEmail("test@sellermap.com");
    setPassword("Test1234!");
    setMode("signin");
  }

  async function enterAsDeveloper() {
    const supabase = createClient();
    if (!supabase) {
      // No Supabase configured (e.g. local dev) — fall back to the demo bypass
      // cookie so the app is still explorable without a backend.
      document.cookie = `sm_dev_bypass=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      go(next);
      return;
    }
    // Real session: sign in as the shared developer account so RLS-scoped data
    // (the account's shop) loads and persists.
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: "test@sellermap.com",
      password: "Test1234!",
    });
    if (error) { setError(error.message); setBusy(false); return; }
    go(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--c-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Package size={22} className="text-[var(--c-green)]" />
          <span className="text-lg font-semibold text-[var(--c-text)]">SellerMap</span>
        </div>

        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 pr-10 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--c-text3)] transition hover:text-[var(--c-text)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === "signin" && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[var(--c-green)]"
                />
                <span className="text-xs text-[var(--c-text2)]">Запомнить меня</span>
              </label>
            )}

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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] py-2.5 text-sm font-semibold text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === "signin" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
              className="text-xs text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
            >
              {mode === "signin" ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
            </button>
            <button
              type="button"
              onClick={fillTest}
              className="text-xs text-[var(--c-text3)] transition hover:text-[var(--c-text2)]"
            >
              Тест-вход
            </button>
          </div>

          <div className="mt-4 border-t border-[var(--c-border)] pt-4">
            <button
              type="button"
              onClick={enterAsDeveloper}
              className="w-full rounded-lg border border-dashed border-[var(--c-border2)] py-2.5 text-sm font-medium text-[var(--c-text2)] transition hover:border-[var(--c-text3)] hover:text-[var(--c-text)]"
            >
              Войти как разработчик (без пароля)
            </button>
          </div>
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
