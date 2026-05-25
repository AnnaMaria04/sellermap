"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SellerProfile {
  company: string;
  businessType: string;
  channels: string[];
  onboardingComplete: boolean;
}

const STORAGE_KEY = "sellermap_profile";
const DEFAULT_PROFILE: SellerProfile = {
  company: "",
  businessType: "",
  channels: [],
  onboardingComplete: false,
};

function loadLocal(): SellerProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveLocal(p: SellerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function useSellerProfile() {
  const [profile, setProfileState] = useState<SellerProfile>(loadLocal);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: re-enable Supabase sync when auth is wired up
    // const supabase = createClient();
    // if (!supabase) { setLoading(false); return; }
    // supabase.auth.getUser().then(({ data }) => {
    //   if (!data.user) { setLoading(false); return; }
    //   supabase
    //     .from("profiles")
    //     .select("company, business_type, channels, onboarding_complete")
    //     .eq("id", data.user.id)
    //     .single()
    //     .then(({ data: row }) => {
    //       if (row) {
    //         const p: SellerProfile = {
    //           company: row.company ?? "",
    //           businessType: row.business_type ?? "",
    //           channels: (row.channels as string[]) ?? [],
    //           onboardingComplete: row.onboarding_complete ?? false,
    //         };
    //         setProfileState(p);
    //         saveLocal(p);
    //       }
    //       setLoading(false);
    //     });
    // });
    setLoading(false);
  }, []);

  const saveProfile = useCallback(async (patch: Partial<SellerProfile>) => {
    const next = { ...profile, ...patch };
    setProfileState(next);
    saveLocal(next);

    // TODO: re-enable Supabase sync when auth is wired up
    // const supabase = createClient();
    // if (!supabase) return;
    // const { data } = await supabase.auth.getUser();
    // if (!data.user) return;
    // await supabase.from("profiles").update({
    //   company: next.company,
    //   business_type: next.businessType,
    //   channels: next.channels,
    //   onboarding_complete: next.onboardingComplete,
    // }).eq("id", data.user.id);
  }, [profile]);

  return { profile, loading, saveProfile };
}
