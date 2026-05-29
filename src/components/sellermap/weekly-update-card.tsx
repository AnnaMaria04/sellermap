import { BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function WeeklyUpdateCard({
  update,
}: {
  update: { title: string; type: string; impact: string; summary: string };
}) {
  return (
    <Card className="p-5 shadow-none">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">
          <BellRing size={18} />
        </span>
        <Badge tone="green">{update.type}</Badge>
      </div>
      <h3 className="font-semibold">{update.title}</h3>
      <p className="mt-2 text-sm font-semibold text-[var(--c-green)]">{update.impact}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--c-text2)]">{update.summary}</p>
    </Card>
  );
}
