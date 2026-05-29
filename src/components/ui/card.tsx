import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 text-[var(--c-text)] soft-shadow",
        className,
      )}
      {...props}
    />
  );
}
