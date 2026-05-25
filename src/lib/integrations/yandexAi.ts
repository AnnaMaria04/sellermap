function yandexToken() {
  return process.env.YANDEX_AI_API_KEY;
}

export async function summarizeWeeklyRules(input: unknown) {
  void input;
  if (!yandexToken()) return { status: "missing-token" as const };
  // TODO: Подключить Yandex AI для сводки недельных правил WB.
  return { status: "not-implemented" as const };
}

export async function generateSellerRecommendations(input: unknown) {
  void input;
  if (!yandexToken()) return { status: "missing-token" as const };
  // TODO: Вернуть структурированный JSON с рисками, возможностями и действиями.
  return { status: "not-implemented" as const };
}
