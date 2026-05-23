export {
  getWbAcceptanceCoefficients as getWbSupplyTariffs,
  getWbBoxTariffs,
  getWbCommissionTariffs as getWbCommission,
  getWbPalletTariffs,
  getWbReturnTariffs,
} from "./wb/tariffs";
export { getSellerGoodsByFilter as getWbProductAnalytics } from "./wb/products";

export async function getWbSearchQueries(nmId: string) {
  void nmId;
  return {
    ok: false,
    status: "missing_token" as const,
    error: "Поисковые отчёты WB требуют отдельного доступа / Jam-подписки",
    fetchedAt: new Date().toISOString(),
  };
}
