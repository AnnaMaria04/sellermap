"use client";

import { StaffPanel } from "@/components/inventory/StaffPanel";

export default function SettingsStaffPage() {
  return (
    <div className="space-y-1">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--c-text)]">Персонал</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Сотрудники, роли и приглашения</p>
      </div>
      <StaffPanel />
    </div>
  );
}
