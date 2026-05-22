import { CheckSquare } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";

export function ActionChecklist({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">План действий</h2>
          <p className="text-sm text-neutral-600">
            Список сформирован из риска маржи, упаковки и анализа карточки.
          </p>
        </div>
        <CheckSquare className="text-primary-green" size={22} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.checklist.map((item) => (
          <label
            key={item}
            className="flex items-center gap-3 rounded-lg border border-light-gray bg-white p-3 text-sm"
          >
            <input type="checkbox" className="h-4 w-4 accent-primary-green" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
