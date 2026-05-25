"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductCard } from "@/lib/inventory/foundation";
import { createInitialStockStatus } from "@/lib/inventory/foundation";
import { createStockMovement } from "@/lib/inventory/manager";
import { getPersistenceStatus, loadWorkspace, resetWorkspace, saveWorkspace } from "@/lib/inventory/persistence";
import { accountingTypeRu, movementTypeRu, purchaseOrderStatusRu, recommendationActionRu } from "@/lib/inventory/ru";
import {
  calculateWorkspaceResult,
  createDemoWorkspace,
  type SellerInventoryWorkspace,
} from "@/lib/inventory/workspace";

type InventoryTab = "overview" | "products" | "operations" | "analytics";

const tabs: Array<{ id: InventoryTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "products", label: "Товары" },
  { id: "operations", label: "Операции" },
  { id: "analytics", label: "Аналитика" },
];

function currency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

export function InventoryWorkspace() {
  const [workspace, setWorkspace] = useState<SellerInventoryWorkspace>(() => createDemoWorkspace());
  const [activeTab, setActiveTab] = useState<InventoryTab>("overview");
  const [selectedProductId, setSelectedProductId] = useState("coffee-beans-250");
  const [notice, setNotice] = useState(getPersistenceStatus().label);
  const [draft, setDraft] = useState({
    name: "",
    sku: "",
    barcode: "",
    purchasePrice: "0",
    salePrice: "0",
    physical: "0",
  });

  useEffect(() => {
    let cancelled = false;

    loadWorkspace().then((loaded) => {
      if (!cancelled) {
        setWorkspace(loaded);
        setNotice(getPersistenceStatus().label);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => calculateWorkspaceResult(workspace), [workspace]);
  const selectedRow = result.rows.find((row) => row.product.id === selectedProductId) ?? result.rows[0];
  const persistence = getPersistenceStatus();

  async function persist(nextWorkspace: SellerInventoryWorkspace, message: string) {
    setWorkspace(nextWorkspace);
    const status = await saveWorkspace(nextWorkspace);
    setNotice(`${message}. ${status.label}`);
  }

  async function addProduct() {
    const productId = `product-${Date.now()}`;
    const purchasePrice = Number(draft.purchasePrice) || 0;
    const salePrice = Number(draft.salePrice) || 0;
    const physical = Number(draft.physical) || 0;

    if (!draft.name.trim() || !draft.sku.trim()) {
      setNotice("Заполните название и артикул товара");
      return;
    }

    const product: ProductCard = {
      id: productId,
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      type: "simple",
      accountingType: "product",
      variants: [],
      channels: [
        { channel: "pos", isActive: true },
        { channel: "website", isActive: true },
      ],
      salePrice,
      purchasePrice,
      marking: { required: false, status: "not_required" },
    };

    if (draft.barcode.trim()) {
      product.barcode = draft.barcode.trim();
    }

    const nextWorkspace: SellerInventoryWorkspace = {
      ...workspace,
      products: [product, ...workspace.products],
      snapshots: [
        {
          productId,
          locationId: "warehouse",
          status: createInitialStockStatus({ physical, warehouse: physical }),
          updatedAt: new Date().toISOString(),
        },
        ...workspace.snapshots,
      ],
      movements: [
        createStockMovement({
          id: `move-${Date.now()}`,
          type: "receipt",
          productId,
          toLocationId: "warehouse",
          quantityDelta: physical,
          beforeQuantity: 0,
          actorId: "owner",
          reason: "Создание товара вручную",
          occurredAt: new Date().toISOString(),
        }),
        ...workspace.movements,
      ],
    };

    setDraft({ name: "", sku: "", barcode: "", purchasePrice: "0", salePrice: "0", physical: "0" });
    setSelectedProductId(productId);
    await persist(nextWorkspace, "Товар создан");
  }

  async function runStocktake() {
    if (!selectedRow?.snapshot) return;

    const product = selectedRow.product;
    const snapshot = selectedRow.snapshot;
    const adjustedPhysical = snapshot.status.physical + 3;
    const nextWorkspace: SellerInventoryWorkspace = {
      ...workspace,
      snapshots: workspace.snapshots.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              status: {
                ...item.status,
                physical: adjustedPhysical,
                warehouse: item.status.warehouse + 3,
              },
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
      movements: [
        createStockMovement({
          id: `stocktake-${Date.now()}`,
          type: "stocktake",
          productId: product.id,
          ...(snapshot.locationId ? { toLocationId: snapshot.locationId } : {}),
          quantityDelta: 3,
          beforeQuantity: snapshot.status.physical,
          actorId: "owner",
          reason: "Контрольный пересчёт: найдено +3 единицы",
          occurredAt: new Date().toISOString(),
        }),
        ...workspace.movements,
      ],
      notifications: [
        {
          id: `notice-stocktake-${Date.now()}`,
          type: "stock_discrepancy",
          channels: ["dashboard"],
          productId: product.id,
          message: `После пересчёта ${product.name}: остаток увеличен на 3 единицы.`,
          createdAt: new Date().toISOString(),
        },
        ...workspace.notifications,
      ],
    };

    await persist(nextWorkspace, "Пересчёт проведён");
  }

  async function receivePurchaseOrder() {
    const order = workspace.purchaseOrders[0];
    if (!order) return;

    const nextWorkspace: SellerInventoryWorkspace = {
      ...workspace,
      purchaseOrders: workspace.purchaseOrders.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: "closed",
              lines: item.lines.map((line) => ({
                ...line,
                quantityReceived: line.quantityOrdered,
              })),
            }
          : item,
      ),
      movements: [
        createStockMovement({
          id: `receive-${Date.now()}`,
          type: "receipt",
          productId: order.lines[0]?.productId ?? "unknown",
          toLocationId: "warehouse",
          quantityDelta: 20,
          beforeQuantity: selectedRow?.snapshot?.status.physical ?? 0,
          actorId: "manager",
          relatedDocumentId: order.id,
          reason: "Закрытие поставки",
          occurredAt: new Date().toISOString(),
        }),
        ...workspace.movements,
      ],
    };

    await persist(nextWorkspace, "Поставка принята");
  }

  async function handleReset() {
    const fresh = resetWorkspace();
    setWorkspace(fresh);
    setSelectedProductId("coffee-beans-250");
    setNotice("Демо-данные восстановлены");
  }

  return (
    <div className="workspace">
      <section className="inventoryHeader">
        <div>
          <h1>Управление складом для малого бизнеса</h1>
          <p>
            Полный seller flow: онбординг, товары, импорт, штрихкоды, поставщики, закупки,
            приёмка, перемещения, пересчёт, списания, аналитика и уведомления.
          </p>
          <div className="statusLine">
            <span>{persistence.label}</span>
            <p>{persistence.detail}</p>
          </div>
        </div>
        <div className="metricStrip">
          <div>
            <span>Доступно</span>
            <strong>{result.availableTotal}</strong>
          </div>
          <div>
            <span>Деньги в товаре</span>
            <strong>{currency(result.inventoryValue)}</strong>
          </div>
          <div>
            <span>Требуют внимания</span>
            <strong>{result.alertsCount}</strong>
          </div>
        </div>
      </section>

      <section className="opsBar" aria-label="Основные действия">
        <button type="button" onClick={() => setActiveTab("products")}>Добавить товар</button>
        <button type="button" onClick={() => setActiveTab("products")}>Импорт Excel / CSV</button>
        <button type="button" onClick={() => setNotice("Сканер штрихкода готов к подключению камеры телефона")}>Сканировать штрихкод</button>
        <button type="button" onClick={() => setNotice("Экспорт подготовлен: товары, остатки, движения, поставщики")}>Экспорт</button>
        <button type="button" onClick={receivePurchaseOrder}>Принять поставку</button>
        <button type="button" onClick={runStocktake}>Провести пересчёт</button>
        <button type="button" onClick={handleReset}>Сбросить демо</button>
      </section>

      <p className="notice">{notice}</p>

      <div className="tabs" role="tablist" aria-label="Разделы склада">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? <Overview workspace={workspace} result={result} /> : null}
      {activeTab === "products" ? (
        <Products
          draft={draft}
          setDraft={setDraft}
          addProduct={addProduct}
          rows={result.rows}
          selectedProductId={selectedProductId}
          setSelectedProductId={setSelectedProductId}
        />
      ) : null}
      {activeTab === "operations" ? (
        <Operations
          workspace={workspace}
          {...(selectedRow?.product.name ? { selectedProductName: selectedRow.product.name } : {})}
        />
      ) : null}
      {activeTab === "analytics" ? <Analytics workspace={workspace} result={result} /> : null}
    </div>
  );
}

function Overview({
  workspace,
  result,
}: {
  workspace: SellerInventoryWorkspace;
  result: ReturnType<typeof calculateWorkspaceResult>;
}) {
  return (
    <section className="inventoryGrid">
      <article className="widePanel">
        <h2>Карта inventory management</h2>
        <div className="blockGrid">
          {[
            "Onboarding и настройка каналов продаж",
            "Products / создание и импорт товаров",
            "Barcodes / labels / Честный Знак",
            "Stock locations / резервы / брак / возвраты",
            "Vendors / supplier catalog / purchase orders",
            "Receiving / transfers / stocktake / write-offs",
            "Movement history / audit trail",
            "Analytics / forecasting / recommendations / alerts",
          ].map((block, index) => (
            <div className="flowBlock" key={block}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{block}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="sidePanel">
        <h2>Профиль продавца</h2>
        <strong>{workspace.sellerName}</strong>
        <p>{workspace.businessProfile.channels.join(" · ")}</p>
        <div className="tagCloud">
          {workspace.businessProfile.locations.map((location) => (
            <span key={location}>{location}</span>
          ))}
        </div>
      </article>

      <article className="widePanel">
        <h2>Check → result</h2>
        <div className="resultGrid">
          <div>
            <span>Проверяем</span>
            <p>Физический остаток, резервы, брак, просрочку, товар в пути и спрос.</p>
          </div>
          <div>
            <span>Получаем</span>
            <p>{result.lowStockCount} товара требуют решения, {currency(result.frozenValue)} заморожено в проблемном товаре.</p>
          </div>
        </div>
      </article>

      <article className="sidePanel">
        <h2>Уведомления</h2>
        <div className="alertList">
          {workspace.notifications.slice(0, 4).map((notification) => (
            <div key={notification.id}>
              <span>{notification.channels.join(" + ")}</span>
              <p>{notification.message}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function Products({
  draft,
  setDraft,
  addProduct,
  rows,
  selectedProductId,
  setSelectedProductId,
}: {
  draft: { name: string; sku: string; barcode: string; purchasePrice: string; salePrice: string; physical: string };
  setDraft: (draft: { name: string; sku: string; barcode: string; purchasePrice: string; salePrice: string; physical: string }) => void;
  addProduct: () => void;
  rows: ReturnType<typeof calculateWorkspaceResult>["rows"];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
}) {
  return (
    <section className="inventoryGrid">
      <article className="widePanel">
        <h2>Товары и остатки</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Учёт</th>
                <th>Доступно</th>
                <th>Дней</th>
                <th>Поставщик</th>
                <th>Маркировка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.product.id}
                  className={row.product.id === selectedProductId ? "selectedRow" : ""}
                  onClick={() => setSelectedProductId(row.product.id)}
                >
                  <td>
                    <strong>{row.product.name}</strong>
                    <span>{row.product.sku}</span>
                  </td>
                  <td>{accountingTypeRu[row.product.accountingType]}</td>
                  <td>{row.availability.availableToSell}</td>
                  <td>{row.demand?.daysUntilStockout ?? "—"}</td>
                  <td>{row.supplier?.name ?? "—"}</td>
                  <td>{row.product.marking?.required ? "Честный Знак" : "Не требуется"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="sidePanel">
        <h2>Создать товар</h2>
        <label>
          Название
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          SKU / артикул
          <input value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
        </label>
        <label>
          Штрихкод
          <input value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
        </label>
        <div className="formGrid">
          <label>
            Закупка
            <input value={draft.purchasePrice} onChange={(event) => setDraft({ ...draft, purchasePrice: event.target.value })} inputMode="decimal" />
          </label>
          <label>
            Цена
            <input value={draft.salePrice} onChange={(event) => setDraft({ ...draft, salePrice: event.target.value })} inputMode="decimal" />
          </label>
          <label>
            Остаток
            <input value={draft.physical} onChange={(event) => setDraft({ ...draft, physical: event.target.value })} inputMode="numeric" />
          </label>
        </div>
        <button className="primaryAction formButton" type="button" onClick={addProduct}>
          Сохранить товар
        </button>
      </article>
    </section>
  );
}

function Operations({ workspace, selectedProductName }: { workspace: SellerInventoryWorkspace; selectedProductName?: string }) {
  return (
    <section className="inventoryGrid">
      <article className="widePanel">
        <h2>История движений</h2>
        <div className="timeline">
          {workspace.movements.map((movement) => (
            <div key={movement.id}>
              <span>{movementTypeRu[movement.type]}</span>
              <strong>{workspace.products.find((product) => product.id === movement.productId)?.name ?? selectedProductName}</strong>
              <p>
                {movement.reason}. Было {movement.beforeQuantity}, стало {movement.afterQuantity}.
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="sidePanel">
        <h2>Закупки</h2>
        {workspace.purchaseOrders.map((order) => (
          <div className="poCard" key={order.id}>
            <span>{purchaseOrderStatusRu[order.status]}</span>
            <strong>{order.id}</strong>
            <p>Ожидаемая дата: {order.expectedArrivalDate}</p>
            <p>Строк: {order.lines.length}</p>
          </div>
        ))}
      </article>
    </section>
  );
}

function Analytics({
  workspace,
  result,
}: {
  workspace: SellerInventoryWorkspace;
  result: ReturnType<typeof calculateWorkspaceResult>;
}) {
  return (
    <section className="inventoryGrid">
      <article className="widePanel">
        <h2>Аналитика денег и спроса</h2>
        <div className="analyticsGrid">
          <div>
            <span>Деньги в товаре</span>
            <strong>{currency(result.inventoryValue)}</strong>
          </div>
          <div>
            <span>Проблемный товар</span>
            <strong>{currency(result.frozenValue)}</strong>
          </div>
          <div>
            <span>Доступно к продаже</span>
            <strong>{result.availableTotal}</strong>
          </div>
        </div>
        <div className="barList">
          {workspace.demand.map((item) => {
            const product = workspace.products.find((candidate) => candidate.id === item.productId);
            return (
              <div key={item.productId}>
                <p>{product?.name}</p>
                <span style={{ width: `${Math.min(100, item.averageDailySales * 8)}%` }} />
                <strong>{number(item.averageDailySales)} / день</strong>
              </div>
            );
          })}
        </div>
      </article>

      <article className="sidePanel">
        <h2>Рекомендации</h2>
        <div className="recommendationList">
          {workspace.recommendations.map((recommendation) => (
            <div key={recommendation.id}>
              <span>{recommendationActionRu[recommendation.action]}</span>
              <p>{recommendation.reason}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
