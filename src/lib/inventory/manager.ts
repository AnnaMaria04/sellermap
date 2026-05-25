import {
  calculateAvailableToSell,
  type InventoryAvailability,
  type InventorySnapshot,
  type MovementRecord,
  type ProductCardDraft,
} from "./foundation";

interface ProductRecord extends ProductCardDraft {
  createdAt: string;
}

interface MovementInput {
  type: MovementRecord["type"];
  sku: string;
  unitsDelta: number;
  location: MovementRecord["location"];
  actorId: string;
  reason?: string;
  documentId?: string;
  createdAt?: string;
}

function cloneSnapshot(snapshot: InventorySnapshot): InventorySnapshot {
  return { ...snapshot };
}

export class InventoryManager {
  private products = new Map<string, ProductRecord>();
  private snapshots = new Map<string, InventorySnapshot>();
  private movements: MovementRecord[] = [];

  createProduct(draft: ProductCardDraft, now = new Date().toISOString()): ProductRecord {
    if (!draft.sku.trim()) throw new Error("SKU is required");
    if (this.products.has(draft.sku)) throw new Error(`Product with SKU ${draft.sku} already exists`);

    const record: ProductRecord = { ...draft, createdAt: now };
    this.products.set(draft.sku, record);
    this.snapshots.set(draft.sku, {
      physicalUnits: 0,
      reservedUnits: 0,
      damagedUnits: 0,
      expiredUnits: 0,
      inTransitUnits: 0,
      shelfUnits: 0,
      storeUnits: 0,
      returnUnits: 0,
      allocatedMarketplaceUnits: 0,
    });

    return record;
  }

  applyMovement(input: MovementInput): MovementRecord {
    const current = this.snapshots.get(input.sku);
    if (!current) throw new Error(`Unknown SKU ${input.sku}`);

    const next = cloneSnapshot(current);
    const delta = Math.floor(input.unitsDelta);

    switch (input.type) {
      case "receipt":
        next.physicalUnits += delta;
        break;
      case "sale":
        next.physicalUnits -= Math.abs(delta);
        break;
      case "reserve":
        next.reservedUnits += delta;
        break;
      case "return":
        next.returnUnits = (next.returnUnits ?? 0) + delta;
        break;
      case "write_off":
        next.damagedUnits += Math.abs(delta);
        break;
      case "transfer":
      case "adjustment":
      case "stocktake":
        next.physicalUnits += delta;
        break;
      case "labeling":
      case "cost_change":
        break;
      default:
        throw new Error("Unsupported movement type");
    }

    this.snapshots.set(input.sku, next);

    const movement: MovementRecord = {
      type: input.type,
      sku: input.sku,
      unitsDelta: input.unitsDelta,
      location: input.location,
      actorId: input.actorId,
      reason: input.reason,
      documentId: input.documentId,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    this.movements.push(movement);
    return movement;
  }

  getAvailability(sku: string): InventoryAvailability {
    const snapshot = this.snapshots.get(sku);
    if (!snapshot) throw new Error(`Unknown SKU ${sku}`);

    return calculateAvailableToSell(snapshot);
  }

  listMovements(sku: string): MovementRecord[] {
    return this.movements.filter((m) => m.sku === sku);
  }
}
