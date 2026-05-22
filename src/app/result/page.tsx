import { CompetitorCard } from "@/components/sellermap/competitor-card";
import { MarketMatrix } from "@/components/sellermap/market-matrix";
import { MarginCalculator } from "@/components/sellermap/margin-calculator";
import {
  ActionChecklist,
  AIRecommendationCards,
  PackagingRiskCard,
  ProductCardAudit,
} from "@/components/sellermap/result-panels";
import { PageSection } from "@/components/sellermap/section";
import { VerdictCard } from "@/components/sellermap/verdict-card";
import { competitors } from "@/mock/sellermap";

export default function ResultPage() {
  return (
    <main className="bg-off-white">
      <PageSection className="space-y-6 py-8">
        <VerdictCard />
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <MarketMatrix />
          <PackagingRiskCard />
        </div>
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Competitors</h2>
              <p className="text-neutral-600">Compact product cards, not dense tables.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {competitors.map((competitor) => (
              <CompetitorCard key={competitor.name} competitor={competitor} />
            ))}
          </div>
        </section>
        <MarginCalculator />
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <ProductCardAudit />
          <div className="space-y-6">
            <AIRecommendationCards />
            <ActionChecklist />
          </div>
        </div>
      </PageSection>
    </main>
  );
}
