"use client";
import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { BusinessSegment, ModuleId } from "@/lib/modules/registry";

export interface SellerProfile {
  id: string;
  email: string;
  name: string;
  company: string;
  businessType: string;
  channels: string[];
  onboardingComplete: boolean;
  /** Primary segment chosen at onboarding (drives the default module set). */
  segment?: BusinessSegment;
  /** Explicit per-module on/off (add-ons / catalog), layered over the preset. */
  moduleOverrides?: Partial<Record<ModuleId, boolean>>;
}

const DEFAULT_PROFILE: SellerProfile = {
  id: "",
  email: "",
  name: "",
  company: "",
  businessType: "",
  channels: [],
  onboardingComplete: false,
  segment: undefined,
  moduleOverrides: {},
};

const STORAGE_KEY = "seller_profile";

export function useSellerProfile() {
  const [profile, setProfile] = useState<SellerProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
  );

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          // No auth — use localStorage fallback
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setProfile(JSON.parse(saved));
          setLoading(false);
          return;
        }

        // Try loading from Supabase profiles table
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (data) {
            setProfile({
              id: user.id,
              email: user.email ?? "",
              name: data.full_name ?? "",
              company: data.company ?? "",
              businessType: data.business_type ?? "",
              channels: data.channels ?? [],
              onboardingComplete: data.onboarding_complete ?? false,
              segment: (data.segment as BusinessSegment | null) ?? undefined,
              moduleOverrides: (data.module_overrides as SellerProfile["moduleOverrides"]) ?? {},
            });
          } else {
            // New user — create profile stub, check localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            const base: SellerProfile = saved
              ? JSON.parse(saved)
              : { ...DEFAULT_PROFILE, id: user.id, email: user.email ?? "" };
            setProfile({ ...base, id: user.id, email: user.email ?? "" });
          }
        } catch {
          // Supabase unavailable — use localStorage fallback
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setProfile(JSON.parse(saved));
          else
            setProfile({ ...DEFAULT_PROFILE, id: user.id, email: user.email ?? "" });
        }
      } catch {
        // Auth unavailable — use localStorage fallback
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setProfile(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = useCallback(
    async (updates: Partial<SellerProfile>) => {
      const next = { ...profile, ...updates };
      setProfile(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }

      if (next.id) {
        try {
          await supabase.from("profiles").upsert({
            id: next.id,
            full_name: next.name,
            company: next.company,
            business_type: next.businessType,
            channels: next.channels,
            onboarding_complete: next.onboardingComplete,
            segment: next.segment ?? null,
            module_overrides: next.moduleOverrides ?? {},
            updated_at: new Date().toISOString(),
          });
        } catch {
          // silently ignore if columns don't exist yet
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  );

  return { profile, loading, saveProfile };
}
