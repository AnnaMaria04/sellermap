import { cn } from "@/lib/utils";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "green" | "mint" | "amber" | "red" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "green" && "bg-soft-green text-dark-green",
        tone === "mint" && "bg-mint text-dark-green",
        tone === "amber" && "bg-warning/15 text-[#8a5a00]",
        tone === "red" && "bg-risk/10 text-risk",
        tone === "neutral" && "bg-off-white text-charcoal",
        className,
      )}
      {...props}
    />
  );
}
