import { Database, KeyRound } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { statusTone } from "./result-style";

export function DataSourcesPanel({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Database size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Источники данных</h2>
          <p className="text-sm text-neutral-600">Статус API и доверие к расчету.</p>
        </div>
      </div>
      <div className="space-y-3">
        {result.dataSources.map((source) => (
          <div key={source.source} className="rounded-lg border border-light-gray bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{source.source}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(source.status)}`}>
                {source.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-off-white">
                <div
                  className="h-2 rounded-full bg-primary-green"
                  style={{ width: `${source.confidence}%` }}
                />
              </div>
              <span className="font-mono text-xs font-semibold tabular">
                {source.confidence}%
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-600">{source.note}</p>
            <p className="mt-1 text-xs text-neutral-400">обновлено: {source.lastUpdated}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-off-white p-3 text-xs leading-5 text-neutral-600">
        <KeyRound size={15} />
        WB_API_TOKEN, MPSTATS_API_TOKEN и YANDEX_AI_API_KEY читаются на серверной стороне.
      </p>
    </Card>
  );
}
