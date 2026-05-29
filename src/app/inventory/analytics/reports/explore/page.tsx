"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ReportExplorer } from "@/components/analytics/ReportExplorer";
import { findReport } from "@/lib/analytics/reports";

function ExploreInner() {
  const params = useSearchParams();
  const slug = params.get("report") ?? undefined;
  const report = slug ? findReport(slug) : undefined;

  return (
    <InventoryShell
      title={report?.title ?? "Новое исследование"}
      subtitle="Конструктор отчётов"
      actions={
        <Link
          href="/inventory/analytics/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"
        >
          <ArrowLeft className="h-4 w-4" /> К отчётам
        </Link>
      }
    >
      <ReportExplorer slug={slug} />
    </InventoryShell>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<InventoryShell title="Исследование"><div /></InventoryShell>}>
      <ExploreInner />
    </Suspense>
  );
}
