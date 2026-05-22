import { competitors } from "@/mock/sellermap";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function MarketMatrix() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Карта рынка</h2>
          <p className="text-sm text-[var(--c-text2)]">Уровень цены и сила отзывов</p>
        </div>
        <Badge tone="green">Ваш товар выделен</Badge>
      </div>
      <div className="relative h-[360px] rounded-lg border border-light-gray bg-off-white matrix-grid">
        <span className="absolute left-4 top-4 text-xs font-semibold text-neutral-500">
          зона возможностей
        </span>
        <span className="absolute right-4 top-4 text-xs font-semibold text-neutral-500">
          лидеры выдачи
        </span>
        <span className="absolute bottom-4 left-4 text-xs font-semibold text-neutral-500">
          дешево, но слабо
        </span>
        <span className="absolute bottom-4 right-4 text-xs font-semibold text-neutral-500">
          риск переплаты
        </span>
        {competitors.map((competitor) => (
          <div
            key={competitor.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-light-gray bg-white px-3 py-2 text-xs shadow-sm"
            style={{ left: `${competitor.x}%`, bottom: `${competitor.y}%` }}
          >
            <div className="font-semibold">{competitor.name}</div>
            <div className="text-neutral-500">{competitor.rating} ★</div>
          </div>
        ))}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-green p-2 shadow-[0_0_0_10px_rgba(154,245,200,0.55)]"
          style={{ left: "58%", bottom: "63%" }}
        >
          <div className="h-4 w-4 rounded-full bg-mint" />
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-neutral-500">
          Уровень цены: низкая → высокая
        </div>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-neutral-500">
          Сила отзывов: низкая → высокая
        </div>
      </div>
    </Card>
  );
}
