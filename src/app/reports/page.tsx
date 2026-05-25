"use client";

import { useEffect, useState } from "react";
import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { savedReports as demoSavedReports } from "@/mock/sellermap";
import { createClient } from "@/lib/supabase/client";

interface StoredReport {
  id: string;
  created_at: string;
  product_name: string;
  sell_price: number;
  buy_price: number;
  profit_per_unit: number;
  margin_pct: number;
  input_data: Record<string, unknown>;
}

export default function SavedReportsPage() {
  const [storedReports, setStoredReports] = useState<StoredReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      // Try Supabase first
      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase
            .from("saved_reports")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
          if (data && data.length > 0) {
            setStoredReports(data as StoredReport[]);
            setLoaded(true);
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }

      // Fall back to localStorage
      try {
        const raw = localStorage.getItem("saved_reports");
        if (raw) {
          setStoredReports(JSON.parse(raw) as StoredReport[]);
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    }

    void load();
  }, []);

  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Сохранённые отчёты</h1>
            <p className="mt-3 text-[var(--c-text2)]">
              Проверки товаров со скорингом, вердиктом, главным риском и статусом запуска.
            </p>
          </div>
          <p className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-semibold text-[var(--c-green)]">
            Экспорт PDF подготовлен для следующего слоя
          </p>
        </div>

        {loaded && storedReports.length > 0 ? (
          <div className="grid gap-4">
            {storedReports.map((report) => (
              <SavedReportCard
                key={report.id}
                report={{
                  id: report.id,
                  name: report.product_name,
                  date: new Date(report.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                  score: Math.min(100, Math.max(0, Math.round(report.margin_pct * 1.5 + 50))),
                  verdict: report.margin_pct > 30 ? "Перспективно" : report.margin_pct > 15 ? "Рабочая маржа" : "Риск",
                  risk: "стоимость упаковки",
                  status: `Маржа ${report.margin_pct.toFixed(1)}% · прибыль ${Math.round(report.profit_per_unit)} ₽/шт`,
                }}
              />
            ))}
          </div>
        ) : loaded ? (
          <>
            <p className="mb-4 text-sm text-[var(--c-text3)]">
              Нет сохранённых отчётов. Ниже — демо-данные.
            </p>
            <div className="grid gap-4">
              {demoSavedReports.map((report) => (
                <SavedReportCard key={report.name} report={{ ...report, id: undefined }} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-[var(--c-text3)]">Загрузка…</div>
        )}
      </PageSection>
    </main>
  );
}
