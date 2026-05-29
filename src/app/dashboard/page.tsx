import { DashboardChartLoader } from "@/components/sellermap/dashboard-chart-loader";
import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { savedReports, weeklyUpdates } from "@/mock/sellermap";

export default function DashboardPage() {
  const stats = [
    ["Товаров проверено", "24"],
    ["Лучшая возможность", "84"],
    ["Главный риск", "возвраты"],
    ["Средняя маржа", "24.8%"],
    ["Алерты упаковки", "3"],
    ["Недельные обновления", "2"],
  ];

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
            {weeklyUpdates.slice(0, 2).map((update) => (
              <WeeklyUpdateCard key={update.title} update={update} />
            ))}
          </div>
        </div>
        <section className="mt-6">
          <h2 className="section-kicker mb-4">Сохранённые проверки товаров</h2>
          <div className="grid gap-4">
            {savedReports.slice(0, 3).map((report) => (
              <SavedReportCard key={report.name} report={report} />
            ))}
          </div>
        </section>
      </PageSection>
    </main>
  );
}
