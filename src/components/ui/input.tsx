import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-light-gray bg-white px-3 text-sm text-charcoal outline-none transition placeholder:text-neutral-400 focus:border-primary-green focus:ring-4 focus:ring-soft-green",
        className,
      )}
      {...props}
    />
  );
}
