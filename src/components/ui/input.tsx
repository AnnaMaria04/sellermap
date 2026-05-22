import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] outline-none transition placeholder:text-[var(--c-text3)] focus:border-[var(--c-border2)] focus:ring-0 font-body",
        className,
      )}
      {...props}
    />
  );
}
