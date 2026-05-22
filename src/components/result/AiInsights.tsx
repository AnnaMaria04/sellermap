import { Bot, ClipboardCheck, FlaskConical, ShieldAlert, ThumbsUp } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";

const groups = [
  ["Что хорошо", "good", ThumbsUp],
  ["Что мешает запуску", "blockers", ShieldAlert],
  ["Что проверить перед закупкой", "beforePurchase", ClipboardCheck],
  ["Какой тест запустить первым", "firstTest", FlaskConical],
] as const;

export function AiInsights({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal text-mint">
          <Bot size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">AI-вывод</h2>
          <p className="text-sm text-neutral-600">Короткая интерпретация для решения.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {groups.map(([label, key, Icon]) => (
          <div key={key} className="rounded-lg border border-light-gray bg-white p-4">
            <Icon size={18} className="text-primary-green" />
            <h3 className="mt-3 font-semibold">{label}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-neutral-600">
              {result.aiInsights[key].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-green" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
