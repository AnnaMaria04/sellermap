import { Check, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { audit, checklist, recommendations } from "@/mock/sellermap";

export function PackagingRiskCard() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/15 text-[#8a5a00]">
          <PackageCheck size={19} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Упаковка и логистика</h2>
          <p className="text-sm text-neutral-600">Учитывается статус недельных правил</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Риск упаковки", "средний"],
          ["Расчётная стоимость", "₽70-120"],
          ["Риск хрупкости", "низкий"],
          ["Риск хранения", "средний"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-light-gray bg-off-white p-3">
            <p className="text-xs font-semibold text-neutral-500">{label}</p>
            <p className="mt-1 font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-soft-green p-4 text-sm leading-6 text-dark-green">
        AI-заметка: проверьте актуальные правила упаковки WB перед закупкой;
        усиленная упаковка может снизить маржу на 3-5 п.п.
      </p>
    </Card>
  );
}

export function ProductCardAudit() {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-semibold">Аудит карточки товара</h2>
      <div className="mt-4 grid gap-3">
        {audit.map(([label, status, detail]) => (
          <div key={label} className="flex gap-3 rounded-lg border border-light-gray p-3">
            <Check size={18} className="mt-0.5 text-primary-green" />
            <div>
              <p className="font-semibold">
                {label}: <span className="text-neutral-600">{status}</span>
              </p>
              <p className="text-sm text-neutral-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AIRecommendationCards() {
  const cards: Array<[string, string[], "amber" | "green" | "red"]> = [
    ["Исправить перед запуском", recommendations.fix, "amber" as const],
    ["Возможность", recommendations.opportunity, "green" as const],
    ["Риск", recommendations.risk, "red" as const],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map(([title, items, tone]) => (
        <Card key={title} className="p-5 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <Badge tone={tone}>AI</Badge>
          </div>
          <ul className="space-y-3 text-sm text-neutral-600">
            {(items as string[]).map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary-green" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function ActionChecklist() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">План действий</h2>
        <Badge tone="mint">Сохранение позже</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {checklist.map((item) => (
          <label
            key={item}
            className="flex items-center gap-3 rounded-lg border border-light-gray bg-white p-3 text-sm"
          >
            <input type="checkbox" className="h-4 w-4 accent-primary-green" />
            {item}
          </label>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
        <TriangleAlert size={15} />
        Экспорт и сохранение отчётов подготовлены для следующего слоя MVP.
      </p>
    </Card>
  );
}
