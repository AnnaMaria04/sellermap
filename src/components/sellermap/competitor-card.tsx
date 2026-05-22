import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";

export function CompetitorCard({
  competitor,
}: {
  competitor: {
    name: string;
    price: number;
    rating: number;
    reviewCount: number;
    position: number;
    strength: string;
    weakness: string;
  };
}) {
  return (
    <Card className="p-4 shadow-none">
      <div className="mb-4 aspect-[4/3] rounded-lg bg-[linear-gradient(135deg,#EAFBF2,#FFFFFF_55%,#E6EAE6)]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{competitor.name}</h3>
          <p className="text-sm text-[var(--c-text3)]">Позиция #{competitor.position}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold tabular">{formatRub(competitor.price)}</p>
          <p className="flex items-center justify-end gap-1 text-sm text-neutral-600">
            <Star size={14} className="fill-warning text-warning" />
            {competitor.rating} · {competitor.reviewCount}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <p>
          <span className="font-semibold text-[var(--c-green)]">Сила:</span>{" "}
          {competitor.strength}
        </p>
        <p>
          <span className="font-semibold text-[var(--c-red)]">Слабость:</span>{" "}
          {competitor.weakness}
        </p>
      </div>
    </Card>
  );
}
