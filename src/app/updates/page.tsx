import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { weeklyUpdates } from "@/mock/sellermap";

export default function WeeklyUpdatesPage() {
  return (
    <main className="bg-off-white">
      <PageSection className="py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Weekly AI updates</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Wildberries rule changes, packaging cost movement, category notes,
            and affected saved products.
          </p>
        </div>
        <Card className="mb-6 bg-dark-green text-white">
          <p className="text-sm font-semibold text-mint">This week</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Packaging changes may affect 3 saved products.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
            AI summary: reinforce packaging assumptions for travel accessory and
            soft goods categories before committing to supplier quantities.
          </p>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          {weeklyUpdates.map((update) => (
            <WeeklyUpdateCard key={update.title} update={update} />
          ))}
        </div>
      </PageSection>
    </main>
  );
}
