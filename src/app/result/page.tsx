"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ActionChecklist } from "@/components/result/ActionChecklist";
import { AiInsights } from "@/components/result/AiInsights";
import { CardAudit } from "@/components/result/CardAudit";
import { CompetitorCards } from "@/components/result/CompetitorCards";
import { DataSourcesPanel } from "@/components/result/DataSourcesPanel";
import { MarginSimulator } from "@/components/result/MarginSimulator";
import { MarketMap } from "@/components/result/MarketMap";
import { PackagingLogistics } from "@/components/result/PackagingLogistics";
import { ResultHeader } from "@/components/result/ResultHeader";
import { ScoreBreakdown } from "@/components/result/ScoreBreakdown";
import { SupplierPanel } from "@/components/result/SupplierPanel";
import { PageSection } from "@/components/sellermap/section";
import { demoResult } from "@/lib/data/demoResult";
import type { ProductResult } from "@/lib/analysis/types";
import type { MarketAggregates } from "@/lib/analysis/marketAggregates";

interface SavedReport {
  id: string;
  created_at: string;
  product_name: string;
  sell_price: number;
  buy_price: number;
  profit_per_unit: number;
  margin_pct: number;
  input_data: Record<string, unknown>;
}

function ResultPageInner() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("report");

  const [result] = useState<ProductResult>(demoResult);
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);

  // Read sessionStorage form input to pre-populate simulator
  const [analysisInput, setAnalysisInput] = useState<Record<string, unknown> | null>(null);

  // Market aggregates loaded from the daily_market_metrics / analysis_competitors tables.
  const [aggregates, setAggregates] = useState<MarketAggregates | null | undefined>(undefined);
  const [aggregatesError, setAggregatesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setAggregates(undefined);
      setAggregatesError(null);
      try {
        const params = new URLSearchParams();
        // Best-effort keyword/category from the analysed product.
        if (result.title) params.set("keyword", result.title);
        if (result.category) params.set("category", result.category);
        const res = await fetch(`/api/analysis/market-aggregates?${params.toString()}`);
        const d = await res.json() as { ok: boolean; aggregates?: MarketAggregates | null; message?: string };
        if (cancelled) return;
        if (!d.ok) {
          setAggregatesError(d.message ?? "ошибка загрузки");
          setAggregates(null);
        } else {
          setAggregates(d.aggregates ?? null);
        }
      } catch (e) {
        if (cancelled) return;
        setAggregatesError(e instanceof Error ? e.message : "ошибка сети");
        setAggregates(null);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [result.title, result.category]);

  const loadData = useCallback(() => {
    // If a saved report ID is in the URL, load from localStorage
    if (reportId) {
      try {
        const reports: SavedReport[] = JSON.parse(
          localStorage.getItem("saved_reports") ?? "[]",
        );
        const found = reports.find((r) => r.id === reportId) ?? null;
        setSavedReport(found);
        if (found) {
          setAnalysisInput(found.input_data);
        }
      } catch {
        // ignore
      }
      return;
    }

    // Otherwise read form input from sessionStorage
    try {
      const raw = sessionStorage.getItem("analysis_input");
      if (raw) {
        setAnalysisInput(JSON.parse(raw) as Record<string, unknown>);
      }
    } catch {
      // ignore
    }
  }, [reportId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <main className="bg-off-white">
      <PageSection className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <ResultHeader
            result={result}
            savedReportId={savedReport?.id}
            savedReportDate={savedReport?.created_at}
          />
          <ScoreBreakdown result={result} />
          <MarketMap
            result={result}
            aggregates={aggregates ?? null}
            loading={aggregates === undefined}
            error={aggregatesError}
          />
          <MarginSimulator result={result} analysisInput={analysisInput} />
          <CompetitorCards result={result} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
            <CardAudit result={result} />
            <div className="space-y-6">
              <AiInsights result={result} />
              <ActionChecklist result={result} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <PackagingLogistics result={result} />
            <SupplierPanel result={result} />
          </div>
          <DataSourcesPanel result={result} />
        </div>
      </PageSection>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[var(--c-text3)]">Загрузка…</div>}>
      <ResultPageInner />
    </Suspense>
  );
}
