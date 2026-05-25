"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreGauge } from "./score-gauge";

export function SavedReportCard({
  report,
}: {
  report: {
    id?: string | undefined;
    name: string;
    date: string;
    score: number;
    verdict: string;
    risk: string;
    status: string;
  };
}) {
  const router = useRouter();
  const tone = report.score >= 80 ? "green" : report.score >= 60 ? "mint" : report.score >= 40 ? "amber" : "red";

  function openReport() {
    if (report.id) {
      router.push(`/result?report=${encodeURIComponent(report.id)}`);
    } else {
      router.push("/result");
    }
  }

  return (
    <Card className="grid gap-4 p-4 shadow-none sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <ScoreGauge score={report.score} size="sm" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{report.name}</h3>
          <Badge tone={tone}>{report.verdict}</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--c-text3)]">
          {report.date} · Главный риск: {report.risk}
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{report.status}</p>
      </div>
      <button
        onClick={openReport}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-semibold text-[var(--c-text2)] hover:border-white/25 hover:text-[var(--c-text)]"
      >
        <FileText size={16} />
        Открыть отчёт
      </button>
    </Card>
  );
}
