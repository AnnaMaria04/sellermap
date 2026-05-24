import { DashboardChartLoader } from "@/components/sellermap/dashboard-chart-loader";
import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { getDashboardData } from "@/services/marketplaceIntelligence";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { stats, cards, updates } = await getDashboardData();

  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Дашборд продавца</h1>
          <p className="mt-3 text-[var(--c-text2)]">
            Сохранённые проверки, динамика рисков и недельные AI-обновления в одном экране.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value]) => (
            <Card key={label} className="p-4 shadow-none">
              <p className="text-sm text-[var(--c-text3)]">{label}</p>
              <p className="font-display mt-2 text-2xl font-semibold tabular">{value}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <Card>
            <h2 className="section-kicker mb-4">Динамика возможности</h2>
            <DashboardChartLoader />
          </Card>
          <div className="grid gap-4">
            {updates.slice(0, 2).map((update) => (
              <WeeklyUpdateCard key={update.title} update={update} />
            ))}
          </div>
        </div>
        <section className="mt-6">
          <h2 className="section-kicker mb-4">Сохранённые проверки товаров</h2>
          <div className="grid gap-4">
            {cards.slice(0, 3).map((report) => (
              <SavedReportCard key={report.name} report={report} />
            ))}
            {!cards.length && (
              <Card className="p-6 text-sm text-[var(--c-text2)]">
                Пока нет сохранённых проверок. Запустите анализ на странице проверки товара, и здесь появится реальная воронка.
              </Card>
            )}
          </div>
        </section>
      </PageSection>
    </main>
  );
}
