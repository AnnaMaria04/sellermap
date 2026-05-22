import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-light-gray bg-white p-5 soft-shadow",
        className,
      )}
      {...props}
    />
  );
}
