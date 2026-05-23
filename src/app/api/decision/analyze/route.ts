import { NextRequest, NextResponse } from "next/server";
import { generatePriceScenarios } from "@/services/economicsCalculator";
import { calculateDataConfidence } from "@/services/confidenceScoring";
import { analyzeDecision } from "@/services/decisionEngine";
import type { EconomicsInput, ProductAnalysisDraft } from "@/types/sellermap";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { draft?: ProductAnalysisDraft };
  if (!body.draft) return NextResponse.json({ error: "draft required" }, { status: 400 });
  const draft = body.draft;
  const dataConfidence = calculateDataConfidence(draft);
  const decision = analyzeDecision(draft, dataConfidence);
  const economicsInput: EconomicsInput | null =
    draft.product.plannedSellingPrice &&
    draft.product.productCostRub &&
    draft.product.packagingCost &&
    draft.product.commissionPercent &&
    draft.product.logisticsCost
      ? {
          sellingPrice: draft.product.plannedSellingPrice,
          productCostRub: draft.product.productCostRub,
          currency: "RUB",
          packagingCost: draft.product.packagingCost,
          supplierDeliveryCost: draft.product.supplierDeliveryCost ?? 0,
          commissionPercent: draft.product.commissionPercent,
          wbLogisticsCost: draft.product.logisticsCost,
          storageCost: draft.product.storageCost ?? 20,
          returnReservePercent: draft.product.returnReservePercent ?? 5,
          taxPercent: draft.product.taxPercent ?? 6,
          adBudgetPercent: draft.product.adBudgetPercent ?? 10,
        }
      : null;
  const priceScenarios = economicsInput
    ? generatePriceScenarios({
        plannedSellingPrice: draft.product.plannedSellingPrice ?? economicsInput.sellingPrice,
        marketMedianPrice: draft.market?.marketStats?.medianPrice,
        economicsInput,
      })
    : [];
  return NextResponse.json({
    dataConfidence,
    decision,
    actionPlan: decision.nextActions,
    priceScenarios,
  });
}
