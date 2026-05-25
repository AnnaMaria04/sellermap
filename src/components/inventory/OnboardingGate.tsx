"use client";

import { useSellerProfile } from "@/hooks/useSellerProfile";
import { OnboardingWizard } from "@/components/inventory/OnboardingWizard";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, loading, saveProfile } = useSellerProfile();
  if (loading) return <>{children}</>;
  if (!profile.onboardingComplete) {
    return <OnboardingWizard onComplete={(p) => saveProfile(p)} />;
  }
  return <>{children}</>;
}
