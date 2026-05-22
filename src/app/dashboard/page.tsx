import { DashboardChartLoader } from "@/components/sellermap/dashboard-chart-loader";
import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { savedReports, weeklyUpdates } from "@/mock/sellermap";

export default function DashboardPage() {
  const stats = [
    ["Products analyzed", "24"],
    ["Best opportunity", "84"],
    ["Highest risk", "Returns"],
    ["Average margin", "24.8%"],
    ["Packaging alerts", "3"],
    ["Weekly updates", "2"],
  ];

  return (
    <main className="bg-off-white">
      <PageSection className="py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Seller dashboard</h1>
          <p className="mt-3 text-neutral-600">
            Saved checks, risk movement, and weekly AI updates in one view.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value]) => (
            <Card key={label} className="p-4 shadow-none">
              <p className="text-sm text-neutral-500">{label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular">{value}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <Card>
            <h2 className="mb-4 text-xl font-semibold">Opportunity movement</h2>
            <DashboardChartLoader />
          </Card>
          <div className="grid gap-4">
            {weeklyUpdates.slice(0, 2).map((update) => (
              <WeeklyUpdateCard key={update.title} update={update} />
            ))}
          </div>
        </div>
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">Saved product checks</h2>
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
