import { Camera, FileText, HelpCircle, Image, ListChecks, MessageSquare, SearchCheck, Sparkles, Tags, WalletCards } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { statusTone } from "./result-style";

const icons = [Camera, Image, Tags, SearchCheck, FileText, ListChecks, MessageSquare, HelpCircle, WalletCards, Sparkles];

export function CardAudit({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Аудит карточки товара</h2>
        <p className="text-sm text-neutral-600">
          Что мешает конверсии и поисковому трафику.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.cardAudit.map((item, index) => {
          const Icon = icons[index] ?? ListChecks;
          return (
            <div key={item.label} className="rounded-lg border border-light-gray bg-white p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-green text-primary-green">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{item.label}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                      {item.score}/100
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-neutral-600">{item.explanation}</p>
                  <p className="mt-2 rounded-lg bg-off-white p-2 text-sm leading-5 text-charcoal">
                    {item.action}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
