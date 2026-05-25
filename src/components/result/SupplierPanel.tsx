import { ExternalLink, Link2 } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";

export function SupplierPanel({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Link2 size={18} />
        </span>
        <div>
          <h2 className="section-kicker">Поставщик</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">Ввод по ссылке и ручное подтверждение.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Output label="Домен" value={result.supplier.domain} />
        <Output label="MOQ (мин. заказ)" value={`${result.supplier.moq} шт.`} />
        <Output label="Цена поставщика" value={`${result.supplier.supplierPrice} ${result.supplier.currency}`} />
        <Output label="Доставка / шт." value={formatRub(result.supplier.shippingPrice)} />
        <Output label="Вес / шт." value={`${result.supplier.unitWeightKg} кг`} />
        <Output label="Срок поставки" value={`${result.supplier.leadTimeDays} дней`} />
      </div>
      <p className="mt-4 rounded-lg bg-[var(--c-amber-dim)] p-3 text-sm leading-6 text-[var(--c-amber)]">
        Требуется ручное подтверждение данных поставщика: цена, вес, MOQ и упаковка.
      </p>
      <a
        href={result.supplier.supplierUrl}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--c-green)]"
        target="_blank"
        rel="noreferrer"
      >
        Открыть ссылку поставщика <ExternalLink size={15} />
      </a>
    </Card>
  );
}

function Output({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
      <p className="text-xs font-semibold text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 font-mono font-semibold tabular">{value}</p>
    </div>
  );
}
