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
        tone === "green" && "bg-[var(--c-green-dim)] text-[var(--c-green)]",
        tone === "mint" && "bg-[var(--c-green-dim)] text-[var(--c-green)]",
        tone === "amber" && "bg-[var(--c-amber-dim)] text-[var(--c-amber)]",
        tone === "red" && "bg-[var(--c-red-dim)] text-[var(--c-red)]",
        tone === "neutral" && "bg-[var(--c-bg3)] text-[var(--c-text3)]",
        className,
      )}
      {...props}
    />
  );
}
