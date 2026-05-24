import { supabaseRest } from "@/services/supabaseRest";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

async function countTable(table: string) {
  const result = await supabaseRest<Array<{ id: string }>>(table, {
    query: { select: "id", limit: "10000" },
  });
  if (!result.ok) return { count: null, error: result.error };
  return { count: result.data.length, error: null };
}

async function recentRows<T>(table: string, select: string, limit = 8) {
  const result = await supabaseRest<T[]>(table, {
    query: { select, order: "created_at.desc", limit: String(limit) },
  });
  return result.ok ? result.data : [];
}

export default async function DataEngineAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const password = process.env.ADMIN_DATA_ENGINE_PASSWORD;
  if (password && params.key !== password) {
    return (
      <main className="min-h-screen bg-[var(--c-bg)] px-6 py-16 text-[var(--c-text)]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-8">
          <p className="text-sm font-semibold text-[var(--c-red)]">Админ-доступ закрыт</p>
          <h1 className="font-display mt-3 text-2xl font-semibold">Data engine</h1>
          <p className="mt-3 text-sm text-[var(--c-text2)]">Добавьте ключ в URL или настройте существующую авторизацию.</p>
        </div>
      </main>
    );
  }

  const tables = [
    "supplier_products",
    "product_fingerprints",
    "wb_search_snapshots",
    "wb_product_snapshots",
    "market_analyses",
    "economics_snapshots",
    "analysis_competitors",
    "tracked_products",
    "tracked_keywords",
    "daily_market_metrics",
    "sales_estimates",
    "weekly_updates",
  ];
  const counts = await Promise.all(tables.map(async (table) => ({ table, ...(await countTable(table)) })));
  const keywords = await recentRows<{ keyword: string; priority: number | null; last_checked_at: string | null }>("tracked_keywords", "keyword,priority,last_checked_at");
  const products = await recentRows<{ nm_id: string; title: string | null; priority: number | null; last_checked_at: string | null }>("tracked_products", "nm_id,title,priority,last_checked_at");

  return (
    <main className="min-h-screen bg-[var(--c-bg)] px-6 py-10 text-[var(--c-text)]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-green)]">SellerMap internal</p>
        <h1 className="font-display mt-3 text-3xl font-semibold">Data engine</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--c-text2)]">
          Проверка того, что flywheel сохраняет продукты поставщиков, WB-снимки, отслеживаемые товары,
          ключевые слова и будущие оценки продаж.
        </p>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {counts.map((item) => (
            <div key={item.table} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
              <p className="text-[11px] uppercase tracking-widest text-[var(--c-text3)]">{item.table}</p>
              <p className="font-display mt-3 text-2xl font-semibold text-[var(--c-green)]">{item.count ?? "—"}</p>
              {item.error && <p className="mt-2 text-xs text-[var(--c-red)]">нет таблицы / ошибка схемы</p>}
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Panel title="Tracked keywords">
            {keywords.map((item) => (
              <Row key={item.keyword} left={item.keyword} right={`priority ${item.priority ?? "—"}`} />
            ))}
          </Panel>
          <Panel title="Tracked products">
            {products.map((item) => (
              <Row key={item.nm_id} left={item.title ?? item.nm_id} right={`арт. ${item.nm_id}`} />
            ))}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <h2 className="font-display text-sm font-semibold text-[var(--c-text)]">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--c-bg3)] px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-[var(--c-text)]">{left}</span>
      <span className="shrink-0 text-xs text-[var(--c-text3)]">{right}</span>
    </div>
  );
}
