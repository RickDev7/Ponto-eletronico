import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border/60 last:border-b-0", className)}>
      <div className="border-b border-border/40 px-5 py-[var(--ui-section-header-py)]">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="px-5 py-[var(--ui-section-body-py)]">{children}</div>
      {footer && (
        <div className="flex justify-end border-t border-border/40 bg-muted/10 px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  htmlFor,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 border-b border-border/40 py-[var(--ui-row-py)] last:border-b-0 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0 pt-0.5">
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-medium text-foreground"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SettingsPlaceholder({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-[12px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
