import { SavedReportCard } from "@/components/sellermap/report-card";
import { PageSection } from "@/components/sellermap/section";
import { savedReports } from "@/mock/sellermap";

export default function SavedReportsPage() {
  return (
    <main className="bg-off-white">
      <PageSection className="py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Saved reports</h1>
            <p className="mt-3 text-neutral-600">
              Product checks with score, verdict, main risk, and launch status.
            </p>
          </div>
          <p className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary-green">
            PDF export ready for next layer
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
