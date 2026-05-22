import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreGauge } from "./score-gauge";

export function SavedReportCard({
  report,
}: {
  report: {
    name: string;
    date: string;
    score: number;
    verdict: string;
    risk: string;
    status: string;
  };
}) {
  const tone = report.score >= 80 ? "green" : report.score >= 60 ? "mint" : report.score >= 40 ? "amber" : "red";

  return (
    <Card className="grid gap-4 p-4 shadow-none sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <ScoreGauge score={report.score} size="sm" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{report.name}</h3>
          <Badge tone={tone}>{report.verdict}</Badge>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {report.date} · Main risk: {report.risk}
        </p>
        <p className="mt-2 text-sm font-semibold text-charcoal">{report.status}</p>
      </div>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-light-gray px-4 text-sm font-semibold hover:border-primary-green hover:text-primary-green">
        <FileText size={16} />
        Open report
      </button>
    </Card>
  );
}
