import {
  MODULES, CORE_MODULES, type ModuleId, type BusinessSegment,
} from "./registry";
import { toOnboardingProfile } from "@/lib/inventory/seller-profile";

/**
 * Resolves which modules a seller sees. Precedence:
 *   1. core modules — always on
 *   2. modules whose `defaultFor` includes the segment
 *   3. modules auto-suggested by a selected sales channel
 *   4. explicit user overrides (true/false win; core can't be turned off)
 * Fallback when no segment is set: infer an operating model from channels, and
 * if still nothing, return the full superset so existing users see no change.
 */
export interface ModuleResolutionInput {
  segment?: BusinessSegment | null;
  channels?: string[];
  overrides?: Partial<Record<ModuleId, boolean>>;
}

const SEGMENT_FROM_OPERATING: Record<string, BusinessSegment> = {
  retail: "small_retail",
  hybrid: "small_retail",
  cafe: "producer",
  small_production: "producer",
};

export function resolveEnabledModules(input: ModuleResolutionInput): Set<ModuleId> {
  const channels = input.channels ?? [];
  const overrides = input.overrides ?? {};

  // Determine effective segment (explicit, else inferred, else none).
  let segment = input.segment ?? null;
  if (!segment && channels.length > 0) {
    const op = toOnboardingProfile({ channels }).businessType;
    segment = SEGMENT_FROM_OPERATING[op] ?? null;
  }

  const enabled = new Set<ModuleId>(CORE_MODULES);

  // No segment at all → superset (no regression for existing users).
  if (!segment) {
    for (const m of MODULES) enabled.add(m.id);
  } else {
    for (const m of MODULES) {
      if (m.core) continue;
      const byDefault = m.defaultFor.includes(segment);
      const byChannel = !!m.suggestedByChannels?.some((c) => channels.includes(c));
      if (byDefault || byChannel) enabled.add(m.id);
    }
  }

  // Explicit overrides last (cannot disable core).
  for (const m of MODULES) {
    const ov = overrides[m.id];
    if (ov === undefined) continue;
    if (ov) enabled.add(m.id);
    else if (!m.core) enabled.delete(m.id);
  }

  return enabled;
}
