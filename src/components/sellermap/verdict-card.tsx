import { ArrowUpRight, Save, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { productCheck, metrics } from "@/mock/sellermap";
import { ScoreGauge } from "./score-gauge";
import { MetricCard } from "./metric-card";

export function VerdictCard() {
  return (
    <Card className="p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <ScoreGauge score={productCheck.score} />
        <div>
          <Badge tone="mint">Opportunity diagnosis</Badge>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {productCheck.verdict}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
            Demand is strong and the niche has a mid-price gap, but the launch
            needs stricter packaging and margin control before stock is ordered.
          </p>
        </div>
        <div className="flex gap-2 lg:flex-col">
          <Button variant="secondary">
            <Save size={16} />
            Save
          </Button>
          <Button variant="secondary">
            <Share2 size={16} />
            Export
          </Button>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} index={index} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        <span className="font-mono tabular">WB nmId {productCheck.wbNmId}</span>
        <span className="h-1 w-1 rounded-full bg-light-gray" />
        <span>{productCheck.category}</span>
        <span className="h-1 w-1 rounded-full bg-light-gray" />
        <span className="inline-flex items-center gap-1 text-primary-green">
          Open demo source <ArrowUpRight size={14} />
        </span>
      </div>
    </Card>
  );
}
