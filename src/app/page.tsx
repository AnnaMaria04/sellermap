import {
  ArrowRight,
  CheckCircle2,
  Database,
  ScanSearch,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSection } from "@/components/sellermap/section";
import { ScoreGauge } from "@/components/sellermap/score-gauge";

export default function LandingPage() {
  const steps: Array<[LucideIcon, string, string]> = [
    [ScanSearch, "Analyze", "Paste a WB link, SKU, product name, or niche."],
    [Database, "Diagnose", "Map price, demand, reviews, packaging, and margin risk."],
    [Sparkles, "Act", "Get a verdict, fixes, and a launch checklist."],
  ];

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Check if a Wildberries product is worth selling before you waste money on stock.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            SellerMap analyzes competition, pricing, reviews, packaging risks,
            logistics, and product-card quality to give you a clear launch verdict.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/check">
              Analyze Product <ArrowRight size={16} />
            </LinkButton>
            <LinkButton href="/result" variant="secondary">
              View demo result
            </LinkButton>
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1fr]">
            <div className="bg-dark-green p-6 text-white">
              <Badge tone="mint">Demo diagnosis</Badge>
              <div className="mt-6">
                <ScoreGauge score={78} />
              </div>
              <p className="mt-5 text-xl font-semibold">Promising, but packaging cost risk</p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Recommended action: improve bundle, confirm packaging cost, and
                keep net margin above 20%.
              </p>
            </div>
            <div className="space-y-4 p-6">
              {[
                ["Competition", "Medium"],
                ["Margin risk", "High"],
                ["Card quality", "Weak"],
                ["Demand", "Strong"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between rounded-lg border border-light-gray p-4">
                  <span className="text-neutral-600">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
              <div className="mt-4 rounded-lg border border-light-gray bg-off-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-neutral-500">Market map</p>
                    <div className="mt-3 h-24 rounded-lg border border-light-gray matrix-grid" />
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-semibold text-neutral-500">Cost stack</p>
                    <div className="mt-3 space-y-2">
                      <span className="block h-2 w-4/5 rounded bg-light-gray" />
                      <span className="block h-2 w-3/5 rounded bg-light-gray" />
                      <span className="block h-2 w-2/3 rounded bg-mint" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <PageSection title="From product idea to launch decision">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([Icon, title, text]) => (
            <Card key={String(title)} className="p-6 shadow-none">
              <Icon className="text-primary-green" size={24} />
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
            </Card>
          ))}
        </div>
      </PageSection>

      <section className="bg-off-white">
        <PageSection title="Built for sellers who need a clear answer">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {["Beginner seller", "Existing WB seller", "Product researcher", "Agency consultant"].map((segment) => (
              <Card key={segment} className="p-5 shadow-none">
                <CheckCircle2 className="text-primary-green" size={20} />
                <h3 className="mt-4 font-semibold">{segment}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Decision-focused diagnostics with less raw-data overload.
                </p>
              </Card>
            ))}
          </div>
        </PageSection>
      </section>
    </main>
  );
}
