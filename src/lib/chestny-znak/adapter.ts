/**
 * Честный Знак — code automation seam (True API / СУЗ).
 *
 * Real operations require the seller's УКЭП: most write calls (auth, ввод в
 * оборот) must be signed with a GOST certificate. We therefore split the
 * concern in two:
 *   - `SigningProvider` — produces a detached signature for a payload. In
 *     production this is the КриптоПро ЭЦП browser plug-in (client-side) or a
 *     cloud signature (КриптоПро DSS). Here it is mocked.
 *   - `ChestnyZnakAdapter` — orchestrates True API/СУЗ calls and uses the
 *     signer where a signature is required.
 *
 * Swapping the mocks for live HTTPS calls + a real signer is the only change
 * needed to go live; nothing else in the app references the wire format.
 */

export type CisStatus = "ordered" | "emitted" | "in_circulation" | "withdrawn" | "error";

export interface MarkingCode {
  cis: string;            // КИ/КИЗ — the data-matrix payload
  gtin: string;
  status: CisStatus;
  emittedAt?: string;
  introducedAt?: string;
}

export interface CodeOrder {
  orderId: string;
  gtin: string;
  groupId: string;        // товарная группа
  quantity: number;
  status: "pending" | "ready" | "rejected";
  createdAt: string;
  codes: MarkingCode[];
}

export interface SignResult {
  signature: string;      // base64 detached CMS/PKCS#7
  certThumbprint: string;
  signedAt: string;
}

/** Client- or cloud-side УКЭП signer. */
export interface SigningProvider {
  /** Is a signing certificate available right now? */
  isAvailable(): Promise<boolean>;
  /** Sign an arbitrary payload (returns detached signature). */
  sign(payload: string): Promise<SignResult>;
  /** Describe the active certificate (for UI). */
  describe(): Promise<{ subject: string; validUntil: string } | null>;
}

export interface ChestnyZnakAdapter {
  authenticate(signer: SigningProvider): Promise<{ token: string; expiresAt: string }>;
  orderCodes(input: { gtin: string; groupId: string; quantity: number }): Promise<CodeOrder>;
  getOrder(orderId: string): Promise<CodeOrder | null>;
  /** Render the scannable Data Matrix payload for a code (SVG/text in mock). */
  generateDataMatrix(cis: string): string;
  /** Ввод в оборот — requires a signature over the document. */
  introduceIntoCirculation(input: { cises: string[]; signer: SigningProvider }): Promise<{ documentId: string; accepted: number }>;
}

// ─────────────────────────────── Mock implementations ───────────────────────

/** Mock signer — simulates the КриптоПро plug-in without a real certificate. */
export class MockSigningProvider implements SigningProvider {
  constructor(private opts: { available?: boolean; subject?: string } = {}) {}
  async isAvailable() {
    return this.opts.available ?? true;
  }
  async sign(payload: string): Promise<SignResult> {
    // Deterministic pseudo-signature so the flow is demonstrable.
    const hash = Array.from(payload).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    return {
      signature: btoa(`MOCK-CMS:${hash.toString(16)}`),
      certThumbprint: "MOCKTHUMB" + (hash % 100000).toString().padStart(5, "0"),
      signedAt: new Date().toISOString(),
    };
  }
  async describe() {
    return { subject: this.opts.subject ?? "ООО «Демо Продавец» (тест)", validUntil: "2027-01-01" };
  }
}

function randomCis(gtin: string, i: number): string {
  const serial = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `01${gtin.padStart(14, "0")}21${serial}${i.toString().padStart(2, "0")}`;
}

export class MockChestnyZnakAdapter implements ChestnyZnakAdapter {
  private orders = new Map<string, CodeOrder>();

  async authenticate(signer: SigningProvider) {
    if (!(await signer.isAvailable())) {
      throw new Error("УКЭП недоступна — подключите токен и КриптоПро плагин");
    }
    await signer.sign("AUTH-CHALLENGE");
    return { token: "mock-truapi-token", expiresAt: new Date(Date.now() + 36e5).toISOString() };
  }

  async orderCodes(input: { gtin: string; groupId: string; quantity: number }): Promise<CodeOrder> {
    const orderId = "ord-" + Date.now().toString(36);
    const codes: MarkingCode[] = Array.from({ length: input.quantity }, (_, i) => ({
      cis: randomCis(input.gtin, i),
      gtin: input.gtin,
      status: "emitted" as CisStatus,
      emittedAt: new Date().toISOString(),
    }));
    const order: CodeOrder = {
      orderId,
      gtin: input.gtin,
      groupId: input.groupId,
      quantity: input.quantity,
      status: "ready",
      createdAt: new Date().toISOString(),
      codes,
    };
    this.orders.set(orderId, order);
    return order;
  }

  async getOrder(orderId: string) {
    return this.orders.get(orderId) ?? null;
  }

  generateDataMatrix(cis: string): string {
    // Mock returns the payload; a real impl renders a GS1 DataMatrix image.
    return cis;
  }

  async introduceIntoCirculation(input: { cises: string[]; signer: SigningProvider }) {
    const doc = `INTRODUCE:${input.cises.join(",")}`;
    await input.signer.sign(doc);
    return { documentId: "doc-" + Date.now().toString(36), accepted: input.cises.length };
  }
}
