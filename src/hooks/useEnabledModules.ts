"use client";

import { useCallback, useMemo } from "react";
import { useSellerProfile } from "./useSellerProfile";
import { resolveEnabledModules } from "@/lib/modules/resolve";
import type { BusinessSegment, ModuleId } from "@/lib/modules/registry";

/** Module gating can be disabled via env (default ON — superset fallback keeps
 *  existing users safe). Set NEXT_PUBLIC_FEATURE_MODULE_GATING="0" to force-off. */
const GATING_ON = process.env.NEXT_PUBLIC_FEATURE_MODULE_GATING !== "0";

/**
 * Resolves the current seller's enabled modules from their profile and exposes
 * helpers to change the segment or toggle individual modules (persisted via
 * useSellerProfile). While loading, returns `enabled: null` so callers can
 * render the full superset (avoids hydration mismatch / nav flicker).
 */
export function useEnabledModules() {
  const { profile, loading, saveProfile } = useSellerProfile();

  const enabled = useMemo<Set<ModuleId> | null>(() => {
    if (loading) return null;
    if (!GATING_ON) return null; // null → callers treat everything as enabled
    return resolveEnabledModules({
      segment: profile.segment ?? null,
      channels: profile.channels ?? [],
      overrides: profile.moduleOverrides ?? {},
    });
  }, [loading, profile.segment, profile.channels, profile.moduleOverrides]);

  const isEnabled = useCallback(
    (id: ModuleId) => (enabled ? enabled.has(id) : true),
    [enabled],
  );

  const setSegment = useCallback(
    (segment: BusinessSegment) => saveProfile({ segment }),
    [saveProfile],
  );

  /** Pass `null` to clear an override (revert to the segment preset). */
  const setOverride = useCallback(
    (id: ModuleId, on: boolean | null) => {
      const next = { ...(profile.moduleOverrides ?? {}) };
      if (on === null) delete next[id];
      else next[id] = on;
      return saveProfile({ moduleOverrides: next });
    },
    [profile.moduleOverrides, saveProfile],
  );

  const resetOverrides = useCallback(() => saveProfile({ moduleOverrides: {} }), [saveProfile]);

  return {
    enabled,
    isEnabled,
    segment: profile.segment,
    overrides: profile.moduleOverrides ?? {},
    setSegment,
    setOverride,
    resetOverrides,
    loading,
  };
}
