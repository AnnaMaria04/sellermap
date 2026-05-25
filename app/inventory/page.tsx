import Link from "next/link";
import {
  calculateAvailableToSell,
  createInitialStockStatus,
  inventoryFlowChecklist,
  type NotificationEvent,
} from "@/lib/inventory/foundation";
import { recommendReorder } from "@/lib/inventory/manager";

const status = createInitialStockStatus({
  physical: 84,
  reserved: 12,
  warehouse: 46,
  showroom: 8,
  store: 30,
  inTransit: 10,
  damaged: 3,
  returns: 4,
  expired: 1,
  marketplaceAllocated: 9,
});

const availability = calculateAvailableToSell(status);

const recommendation = recommendReorder({
  id: "rec-order-now",
  productId: "coffee-beans-250",
  availability,
  demand: {
    productId: "coffee-beans-250",
    averageDailySales: 8,
    averageWeeklySales: 56,
    averageMonthlySales: 240,
    margin: 34,
    inventoryValue: 126000,
  },
  supplierLeadTimeDays: 9,
});

const operations = [
  "Add product",
  "Import",
  "Scan barcode",
  "Export",
  "More actions",
  "Purchase orders",
  "Transfers",
  "Stocktake",
];

const inventoryBlocks = [
  "Onboarding and sales channels",
  "Products, variants, and import",
  "Barcodes, labels, and Chestny Znak",
  "Locations, reserves, damage, and returns",
  "Vendors, supplier catalog, and purchase orders",
  "Receiving, transfers, stocktake, and write-offs",
  "Movement history and audit trail",
  "Analytics, forecasting, recommendations, and alerts",
];

const notifications: NotificationEvent[] = [
  {
    id: "low-stock",
    type: "low_stock",
    channels: ["dashboard", "telegram"],
    productId: "coffee-beans-250",
    message: "Coffee beans will run out before the supplier lead time ends.",
    createdAt: "2026-05-24T23:30:00.000Z",
  },
  {
    id: "supplier-price",
    type: "supplier_price_increased",
    channels: ["dashboard", "email"],
    supplierId: "supplier-1",
    message: "Supplier purchase price changed; margin needs review.",
    createdAt: "2026-05-24T23:30:00.000Z",
  },
];

export default function InventoryPage() {
  return (
    <main className="shell inventoryShell">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" href="/">
          SellerMap
        </Link>
        <div className="navLinks">
          <Link href="/">Tracks</Link>
          <Link href="/inventory" aria-current="page">
            Inventory
          </Link>
        </div>
      </nav>

      <section className="inventoryHeader">
        <div>
          <h1>Business inventory command center</h1>
          <p>
            A seller flow from first onboarding to daily stock control, built around one product record, many
            channels, and one shared available-to-sell number.
          </p>
        </div>
        <div className="metricStrip">
          <div>
            <span>Available</span>
            <strong>{availability.availableToSell}</strong>
          </div>
          <div>
            <span>Reserved</span>
            <strong>{status.reserved}</strong>
          </div>
          <div>
            <span>In transit</span>
            <strong>{status.inTransit}</strong>
          </div>
        </div>
      </section>

      <section className="opsBar" aria-label="Inventory actions">
        {operations.map((operation) => (
          <button key={operation} type="button">
            {operation}
          </button>
        ))}
      </section>

      <section className="inventoryGrid">
        <article className="widePanel">
          <h2>Final inventory map</h2>
          <div className="blockGrid">
            {inventoryBlocks.map((block, index) => (
              <div className="flowBlock" key={block}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{block}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="sidePanel">
          <h2>Recommendation</h2>
          {recommendation ? (
            <>
              <strong>{recommendation.action.replaceAll("_", " ")}</strong>
              <p>{recommendation.reason}</p>
              <span className="quantity">Suggested quantity: {recommendation.suggestedQuantity}</span>
            </>
          ) : (
            <p>No urgent reorder action.</p>
          )}
        </article>

        <article className="widePanel">
          <h2>Seller flow checklist</h2>
          <ol className="checklist">
            {inventoryFlowChecklist.map((item) => (
              <li key={item}>{item.replaceAll("_", " ")}</li>
            ))}
          </ol>
        </article>

        <article className="sidePanel">
          <h2>Alerts</h2>
          <div className="alertList">
            {notifications.map((notification) => (
              <div key={notification.id}>
                <span>{notification.channels.join(" + ")}</span>
                <p>{notification.message}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
