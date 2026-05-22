const WB_API_URL = "https://dev.wildberries.ru";

function wbToken() {
  return process.env.WB_API_TOKEN;
}

export async function getWbCommission(categoryId: string) {
  void categoryId;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить официальный endpoint комиссий WB после согласования доступа.
  return { status: "not-implemented" as const, baseUrl: WB_API_URL };
}

export async function getWbBoxTariffs(date: string) {
  void date;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить тарифы коробов WB.
  return { status: "not-implemented" as const };
}

export async function getWbPalletTariffs(date: string) {
  void date;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить тарифы паллет WB.
  return { status: "not-implemented" as const };
}

export async function getWbSupplyTariffs(warehouseIds: string[]) {
  void warehouseIds;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить тарифы поставок по складам WB.
  return { status: "not-implemented" as const };
}

export async function getWbReturnTariffs(date: string) {
  void date;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить тарифы возвратов WB.
  return { status: "not-implemented" as const };
}

export async function getWbProductAnalytics(nmId: string) {
  void nmId;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить аналитику товара через seller-authorized WB API.
  return { status: "not-implemented" as const };
}

export async function getWbSearchQueries(nmId: string) {
  void nmId;
  if (!wbToken()) return { status: "missing-token" as const };
  // TODO: Подключить поисковые запросы при наличии доступа WB.
  return { status: "not-implemented" as const };
}
