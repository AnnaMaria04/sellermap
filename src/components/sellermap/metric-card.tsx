import { Activity, BadgeAlert, ChartNoAxesCombined, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const icons = [Activity, ChartNoAxesCombined, BadgeAlert, Image];

export function MetricCard({
  metric,
  index,
}: {
  metric: {
    label: string;
    status: string;
    tone: "green" | "amber" | "red";
    detail: string;
  };
  index: number;
}) {
  const Icon = icons[index] ?? Activity;
  return (
    <Card className="p-4 shadow-none">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Icon size={18} />
        </span>
        <Badge tone={metric.tone}>{metric.status}</Badge>
      </div>
      <h3 className="font-semibold text-charcoal">{metric.label}</h3>
      <p className="mt-1 text-sm leading-6 text-neutral-600">{metric.detail}</p>
    </Card>
  );
}
