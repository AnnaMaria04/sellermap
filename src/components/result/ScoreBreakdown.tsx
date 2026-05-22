import { Activity, Boxes, Image, PackageCheck, SearchCheck, ShieldAlert, TrendingUp } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { statusTone } from "./result-style";

const icons = [TrendingUp, Activity, ShieldAlert, PackageCheck, Image, SearchCheck, Boxes];

export function ScoreBreakdown({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-kicker">Разбор скоринга</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">Оценка 0-100 по факторам запуска.</p>
        </div>
        <span className="font-mono text-sm font-semibold tabular text-primary-green">
          {result.score}/100
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {result.scoreBreakdown.map((item, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <div key={item.key} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
                  <Icon size={16} />
                </span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm font-semibold">{item.label}</p>
              <div className="mt-2 h-2 rounded-full bg-[var(--c-bg2)]">
                <div
                  className="h-2 rounded-full bg-[var(--c-green)]"
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-sm font-semibold tabular">{item.score}/100</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
