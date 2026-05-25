import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { savedReports } from "@/mock/sellermap";

export default function SavedReportsPage() {
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
        <div className="grid gap-4">
          {savedReports.map((report) => (
            <SavedReportCard key={report.name} report={report} />
          ))}
        </div>
      </PageSection>
    </main>
  );
}
