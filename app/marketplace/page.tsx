import { AppNav } from "../_components/AppNav";
import { calculateResult, validateMarginResult } from "@/lib/analysis/calculateResult";

const result = calculateResult({
  productName: "Органайзер для кухни",
  category: "Дом",
  wbQuery: "органайзер кухня",
  supplierUrl: "https://supplier.example/item",
  marginInput: {
    sellingPrice: 2950,
    costPrice: 1180,
    wbCommission: 0.18,
    wbLogistics: 210,
    packagingCost: 95,
    adSpend: 28000,
    storagePerMonth: 6400,
    returnRate: 0.08,
    unitsPerMonth: 220,
    taxRate: 0.06,
  },
  packagingInput: {
    lengthCm: 32,
    widthCm: 18,
    heightCm: 12,
    weightKg: 1.2,
    fragility: "средняя",
  },
});

const warnings = validateMarginResult(result.margin);

export default function MarketplacePage() {
  return (
    <main className="shell inventoryShell">
      <AppNav active="marketplace" />

      <section className="inventoryHeader">
        <div>
          <h1>Маркетплейс-аналитика сохранена</h1>
          <p>
            Этот трек отвечает за проверку товара до закупки: маржа, точка безубыточности,
            логистика WB, упаковка, возвраты, рекламный бюджет и риски карточки.
          </p>
        </div>
        <div className="metricStrip">
          <div>
            <span>Маржа</span>
            <strong>{result.margin.marginPercent.toFixed(1)}%</strong>
          </div>
          <div>
            <span>Прибыль / месяц</span>
            <strong>{Math.round(result.margin.monthlyProfit).toLocaleString("ru-RU")} ₽</strong>
          </div>
          <div>
            <span>Риск</span>
            <strong>{result.margin.riskLabel}</strong>
          </div>
        </div>
      </section>

      <section className="inventoryGrid">
        <article className="widePanel">
          <h2>Check → result по товару</h2>
          <div className="analyticsGrid">
            <div>
              <span>Цена безубыточности</span>
              <strong>{result.margin.breakEvenPrice.toLocaleString("ru-RU")} ₽</strong>
            </div>
            <div>
              <span>Безопасная цена</span>
              <strong>{result.margin.safePriceMin.toLocaleString("ru-RU")} ₽</strong>
            </div>
            <div>
              <span>Лимит рекламы</span>
              <strong>{result.margin.maxAdSpend.toLocaleString("ru-RU")} ₽</strong>
            </div>
          </div>
          <div className="barList">
            {result.margin.sensitivity.map((scenario) => (
              <div key={scenario.label}>
                <p>{scenario.label}</p>
                <span style={{ width: `${Math.min(100, Math.abs(scenario.marginDelta) * 8)}%` }} />
                <strong>{scenario.marginDelta.toFixed(1)} п.п.</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="sidePanel">
          <h2>Упаковка и логистика</h2>
          <strong>{result.packaging.wbLogisticsEstimate.toLocaleString("ru-RU")} ₽</strong>
          <p>Оценка логистики WB с учётом габаритов, веса и резерва на возвраты.</p>
          <span className="quantity">Упаковка: {result.packaging.packagingCostPerUnit} ₽ / шт.</span>
        </article>

        <article className="widePanel">
          <h2>Аудит карточки</h2>
          <div className="blockGrid">
            {result.audit.map((item) => (
              <div className="flowBlock" key={item.type}>
                <span>{item.type}</span>
                <p>{item.message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="sidePanel">
          <h2>Предупреждения</h2>
          <div className="alertList">
            {(warnings.length ? warnings : ["Критичных предупреждений нет"]).map((warning) => (
              <div key={warning}>
                <span>Проверка</span>
                <p>{warning}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
