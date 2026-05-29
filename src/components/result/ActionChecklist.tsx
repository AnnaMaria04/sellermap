import { CheckSquare } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";

export function ActionChecklist({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="section-kicker">План действий</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            Список сформирован из риска маржи, упаковки и анализа карточки.
          </p>
        </div>
        <CheckSquare className="text-[var(--c-green)]" size={22} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.checklist.map((item) => (
          <label
            key={item}
            className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-sm"
          >
            <input type="checkbox" className="h-4 w-4 accent-[var(--c-green)]" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
