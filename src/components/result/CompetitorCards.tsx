"use client";

import { ChevronDown, Star } from "lucide-react";

function getBasketNum(nmId: number): string {
  const vol = Math.floor(nmId / 100000);
  if (vol <= 143) return "01";
  if (vol <= 287) return "02";
  if (vol <= 431) return "03";
  if (vol <= 719) return "04";
  if (vol <= 1007) return "05";
  if (vol <= 1061) return "06";
  if (vol <= 1115) return "07";
  if (vol <= 1169) return "08";
  if (vol <= 1313) return "09";
  if (vol <= 1601) return "10";
  if (vol <= 1655) return "11";
  if (vol <= 1919) return "12";
  if (vol <= 2045) return "13";
  if (vol <= 2189) return "14";
  if (vol <= 2405) return "15";
  return "16";
}

function wbImageUrl(nmId: string): string {
  const id = Number(nmId);
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  return `https://basket-${getBasketNum(id)}.wbbasket.ru/vol${vol}/part${part}/${id}/images/c246x328/1.jpg`;
}

function WbImage({ nmId, name }: { nmId: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="mb-4 aspect-[4/3] rounded-lg border border-[var(--c-border)] bg-[linear-gradient(135deg,rgba(31,209,131,0.18),rgba(255,255,255,0.04)_55%,rgba(255,255,255,0.08))]" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wbImageUrl(nmId)}
      alt={name}
      className="mb-4 aspect-[4/3] w-full rounded-lg border border-[var(--c-border)] object-cover"
      onError={() => setFailed(true)}
    />
  );
}
import { useState } from "react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import { riskLabel } from "./result-style";

export function CompetitorCards({ result }: { result: ProductResult }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-kicker">Конкурентный срез</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            До 5 ключевых карточек: продажи, позиция, УТП и причина спроса.
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-transparent px-4 text-sm font-medium text-[var(--c-text2)] hover:border-white/25 hover:text-[var(--c-text)]">
          Показать больше <ChevronDown size={15} />
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {result.competitors.map((competitor) => (
          <Card key={competitor.nmId} className="rounded-xl border-[var(--c-border)] bg-[var(--c-bg2)] p-4 shadow-none transition hover:border-[var(--c-border2)]">
            <WbImage nmId={competitor.nmId} name={competitor.name} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{competitor.name}</h3>
                <p className="mt-1 text-xs text-[var(--c-text3)]">nmId {competitor.nmId}</p>
              </div>
              <span className="rounded-full bg-[var(--c-bg3)] px-2 py-1 text-xs font-semibold text-[var(--c-text2)]">
                #{competitor.position}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Цена" value={formatRub(competitor.price)} />
              <Metric
                label="Рейтинг"
                value={`${competitor.rating} ★`}
                icon={<Star size={12} className="fill-[var(--c-amber)] text-[var(--c-amber)]" />}
              />
              <Metric label="Отзывы" value={competitor.reviews.toLocaleString("ru-RU")} />
              <Metric label="Продажи" value={`${competitor.estimatedMonthlySales} шт`} />
              <Metric label="Выручка" value={formatRub(competitor.estimatedRevenue)} wide />
              <Metric label="Риск" value={riskLabel(competitor.riskLevel)} />
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p>
                <span className="font-semibold text-[var(--c-green)]">Сила:</span>{" "}
                {competitor.strength}
              </p>
              <p>
                <span className="font-semibold text-[var(--c-red)]">Слабость:</span>{" "}
                {competitor.weakness}
              </p>
              <p>
                <span className="font-semibold">Позиция:</span>{" "}
                {competitor.positioning}
              </p>
              <p className="rounded-lg bg-[var(--c-green-dim)] p-2 text-[var(--c-green)]">
                {competitor.aiInsight}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  wide,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-[var(--c-bg3)] p-2 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-mono font-semibold tabular">
        {icon}
        {value}
      </p>
    </div>
  );
}
