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

export default function ResultPage() {
  return (
    <main className="bg-off-white">
      <PageSection className="py-8">
        {/* Above the fold: decision card only */}
        <ResultHeader result={demoResult} />

        <div className="mt-8 flex justify-center">
          <a
            href="#analysis"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--c-text3)] transition hover:text-[var(--c-text2)]"
          >
            ↓ Подробный анализ
          </a>
        </div>

        {/* Below the fold */}
        <div id="analysis" className="mt-6 scroll-mt-4 space-y-6">
          {/* 1. Разбор скоринга */}
          <ScoreBreakdown result={demoResult} />

          {/* 2. Симулятор цены и маржи */}
          <MarginSimulator result={demoResult} />

          {/* 3. Карта рынка */}
          <MarketMap result={demoResult} />

          {/* 4. Конкурентный срез */}
          <CompetitorCards result={demoResult} />

          {/* AI insights + checklist — contextual follow-up to competitive analysis */}
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <AiInsights result={demoResult} />
            <ActionChecklist result={demoResult} />
          </div>

          {/* 5. Аудит карточки товара */}
          <CardAudit result={demoResult} />

          {/* 6. Упаковка и логистика */}
          <PackagingLogistics result={demoResult} />

          {/* 7. Поставщик */}
          <SupplierPanel result={demoResult} />

          {/* 8. Источники данных */}
          <DataSourcesPanel result={demoResult} />
        </div>
      </PageSection>
    </main>
  );
}
