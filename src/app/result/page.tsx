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
      <PageSection className="space-y-6 py-8">
        <ResultHeader result={demoResult} />
        <ScoreBreakdown result={demoResult} />
        <MarketMap result={demoResult} />
        <MarginSimulator result={demoResult} />
        <CompetitorCards result={demoResult} />
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <CardAudit result={demoResult} />
          <div className="space-y-6">
            <AiInsights result={demoResult} />
            <ActionChecklist result={demoResult} />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <PackagingLogistics result={demoResult} />
          <SupplierPanel result={demoResult} />
        </div>
        <DataSourcesPanel result={demoResult} />
      </PageSection>
    </main>
  );
}
