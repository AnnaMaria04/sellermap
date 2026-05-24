import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { Card } from "@/components/ui/card";
import { getLatestAnalyses, analysisToCard } from "@/services/marketplaceIntelligence";

export const dynamic = "force-dynamic";

export default async function SavedReportsPage() {
  const reports = (await getLatestAnalyses(50)).map(analysisToCard);
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
            {reports.length} сохранённых анализов
          </p>
        </div>
        <div className="grid gap-4">
          {reports.map((report) => (
            <SavedReportCard key={report.name} report={report} />
          ))}
          {!reports.length && (
            <Card className="p-6 text-sm text-[var(--c-text2)]">
              Нет сохранённых отчётов. После анализа товара SellerMap сохранит поставщика, конкурентов, экономику и решение.
            </Card>
          )}
        </div>
      </PageSection>
    </main>
  );
}
