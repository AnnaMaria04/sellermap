import { cn } from "@/lib/utils";

export function PageSection({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8", className)}>
      {(title || eyebrow) && (
        <div className="mb-6 max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold text-[var(--c-green)]">{eyebrow}</p>
          )}
          {title && (
            <h2 className="section-kicker text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
