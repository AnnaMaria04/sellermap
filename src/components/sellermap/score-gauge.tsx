import { cn } from "@/lib/utils";

export function ScoreGauge({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const angle = score * 3.6;

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full",
        size === "lg" ? "h-44 w-44" : "h-24 w-24",
      )}
      style={{
        background: `conic-gradient(#0F7A4F ${angle}deg, #E6EAE6 0deg)`,
      }}
    >
      <div className="absolute inset-3 rounded-full bg-white" />
      <div className="relative text-center">
        <div
          className={cn(
            "font-mono font-semibold tabular text-dark-green",
            size === "lg" ? "text-4xl" : "text-xl",
          )}
        >
          {score}
        </div>
        <div className="text-xs font-semibold text-neutral-500">/ 100</div>
      </div>
    </div>
  );
}
