import {
  buildSellerModuleTabs,
  type SellerOnboardingProfile,
  type SalesChannel,
  type BusinessType,
  type StockLocationType,
} from "@/lib/inventory/foundation";

/**
 * G19: bridge the onboarding profile (free-form, collected by useSellerProfile)
 * to the typed SellerOnboardingProfile contract in foundation.ts, and drive the
 * visible module set through buildSellerModuleTabs — both previously unused.
 */

const KNOWN_CHANNELS: SalesChannel[] = [
  "pos",
  "website",
  "telegram",
  "delivery",
  "wildberries",
  "ozon",
  "yandex_market",
];

export interface ProfileInput {
  businessType?: string;
  channels?: string[];
}

/** Normalise a collected profile into the typed onboarding contract. */
export function toOnboardingProfile(p: ProfileInput): SellerOnboardingProfile {
  const channels = (p.channels ?? []).filter(
    (c): c is SalesChannel => (KNOWN_CHANNELS as string[]).includes(c),
  );
  // The wizard collects a legal-entity type, not an operating model — infer the
  // operating model from the channel mix.
  const hasOffline = channels.includes("pos");
  const businessType: BusinessType = hasOffline ? "hybrid" : "retail";
  const locations: StockLocationType[] = hasOffline
    ? ["warehouse", "store"]
    : ["warehouse"];
  return { businessType, channels, locations };
}

/** The module tabs a seller should see, derived from their profile. */
export function sellerModuleTabs(p: ProfileInput): string[] {
  return buildSellerModuleTabs(toOnboardingProfile(p));
}
