import { ResultClient } from "@/components/result/ResultClient";
import { PageSection } from "@/components/sellermap/section";
import { calculatePackagingRisk } from "@/lib/analysis/calculateResult";
import type { RawResultInput } from "@/lib/analysis/types";
import { demoResultInput } from "@/lib/data/demoResult";

type ResultSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalNumberParam(value: string | string[] | undefined) {
  const raw = firstValue(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDimensions(value: string | string[] | undefined) {
  const raw = firstValue(value);
  if (!raw) return null;
  const parts = raw
    .replace(/,/g, ".")
    .split(/[xх*×\s]+/i)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0);

  if (parts.length < 3) return null;
  return { lengthCm: parts[0], widthCm: parts[1], heightCm: parts[2] };
}

function buildInputFromParams(params: Record<string, string | string[] | undefined>): RawResultInput {
  const input: RawResultInput = {
    ...demoResultInput,
    marginInput: { ...demoResultInput.marginInput },
    packagingInput: { ...demoResultInput.packagingInput },
    supplier: { ...demoResultInput.supplier },
    dataSources: [...demoResultInput.dataSources],
    competitors: [...demoResultInput.competitors],
    cardAuditSeed: [...demoResultInput.cardAuditSeed],
  };

  const title = firstValue(params.name);
  const category = firstValue(params.category);
  const supplierUrl = firstValue(params.supplierUrl);
  const dimensions = parseDimensions(params.dimensions);
  const productCost = optionalNumberParam(params.cost);
  const supplierShipping = optionalNumberParam(params.supplierShipping);
  const sellingPrice = optionalNumberParam(params.price);
  const packagingCost = optionalNumberParam(params.packaging);
  const weightKg = optionalNumberParam(params.weight);
  const moq = optionalNumberParam(params.moq);

  if (title) input.title = title;
  if (category) {
    input.category = category;
    input.packagingInput.category = category;
  }
  if (supplierUrl) input.supplier.supplierUrl = supplierUrl;
  if (dimensions) input.packagingInput = { ...input.packagingInput, ...dimensions };

  if (weightKg) input.packagingInput.weightKg = weightKg;
  if (moq) input.packagingInput.quantityPerShipment = moq;
  input.supplier = {
    ...input.supplier,
    supplierUrl: supplierUrl || input.supplier.supplierUrl,
    supplierPrice: productCost ?? input.supplier.supplierPrice,
    shippingPrice: supplierShipping ?? input.supplier.shippingPrice,
    unitWeightKg: weightKg ?? input.supplier.unitWeightKg,
    moq: moq ?? input.supplier.moq,
    currency: "RUB",
  };

  const packaging = calculatePackagingRisk(input.packagingInput);
  input.marginInput = {
    ...input.marginInput,
    sellingPrice: sellingPrice ?? input.marginInput.sellingPrice,
    costPrice:
      productCost || supplierShipping
        ? (productCost ?? Math.max(0, input.marginInput.costPrice - input.supplier.shippingPrice)) +
          (supplierShipping ?? input.supplier.shippingPrice)
        : input.marginInput.costPrice,
    packagingCost: packagingCost ?? input.marginInput.packagingCost,
    wbLogistics: packaging.wbLogisticsEstimate,
    unitsPerMonth: moq ? Math.max(30, Math.min(300, moq)) : input.marginInput.unitsPerMonth,
  };

  input.summary =
    "Оценка построена от экономики поставщика: себестоимость, доставка, MOQ, упаковка и сравнение с текущим конкурентным кластером WB.";

  return input;
}

export default async function ResultPage({ searchParams }: { searchParams: ResultSearchParams }) {
  const params = await searchParams;
  const initialInput = buildInputFromParams(params);
  const draftId = firstValue(params.draftId);

  return (
    <main className="bg-off-white">
      <PageSection className="py-8">
        <ResultClient initialInput={initialInput} draftId={draftId} />
      </PageSection>
    </main>
  );
}
