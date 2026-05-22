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
        background: `conic-gradient(var(--c-green) ${angle}deg, rgba(255,255,255,0.08) 0deg)`,
      }}
    >
      <div className="absolute inset-3 rounded-full bg-[var(--c-bg2)]" />
      <div className="relative text-center">
        <div
          className={cn(
            "font-display font-semibold tabular text-[var(--c-green)]",
            size === "lg" ? "text-4xl" : "text-xl",
          )}
        >
          {score}
        </div>
        <div className="font-body text-xs font-medium text-[var(--c-text3)]">/ 100</div>
      </div>
    </div>
  );
}
