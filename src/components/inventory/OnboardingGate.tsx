"use client";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { OnboardingWizard } from "./OnboardingWizard";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, loading, saveProfile } = useSellerProfile();

  if (loading) return <>{children}</>;

  return (
    <>
      {children}
      {!profile.onboardingComplete && profile.id && (
        <OnboardingWizard
          onComplete={() => saveProfile({ onboardingComplete: true })}
        />
      )}
    </>
  );
}
