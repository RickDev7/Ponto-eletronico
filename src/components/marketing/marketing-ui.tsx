import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

export function MarketingSection({
  children,
  className,
  id,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "muted" | "white" | "gradient";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28",
        variant === "default" && "bg-background",
        variant === "muted" && "bg-muted/40",
        variant === "white" && "border-y border-border bg-card",
        variant === "gradient" &&
          "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--accent),transparent)] bg-background",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-14 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function MarketingCard({
  children,
  className,
  highlight,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-ds-soft sm:p-8",
        highlight && "border-primary ring-2 ring-primary/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function IconBox({
  children,
  className,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "success" | "warning" | "muted";
}) {
  const variants = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div
      className={cn(
        "mb-4 flex size-11 items-center justify-center rounded-xl",
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-ds-soft transition-colors hover:bg-primary/90",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground shadow-ds-soft transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function FloatingKpiCard({
  label,
  value,
  className,
  tone = "default",
  animate = false,
}: {
  label: string;
  value: string;
  className?: string;
  tone?: "default" | "primary" | "success" | "warning";
  animate?: boolean;
}) {
  const valueTone = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-ds-medium",
        animate && "auth-kpi-float",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", valueTone)}>{value}</p>
    </div>
  );
}

export function MetricStrip({
  metrics,
}: {
  metrics: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="text-center sm:text-left">
          <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {m.value}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

export function IndustryPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function ProblemCompareCard({
  replaceTag,
  withTag,
  replace,
  withLabel,
  replaceIcon,
  withIcon,
}: {
  replaceTag: string;
  withTag: string;
  replace: string;
  withLabel: string;
  replaceIcon: ReactNode;
  withIcon: ReactNode;
}) {
  return (
    <MarketingCard className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {replaceIcon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {replaceTag}
          </p>
          <p className="font-medium text-foreground line-through decoration-muted-foreground/50">
            {replace}
          </p>
        </div>
      </div>
      <div className="flex justify-center">
        <ArrowRight className="size-4 rotate-90 text-primary sm:rotate-0" />
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {withIcon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{withTag}</p>
          <p className="font-semibold text-foreground">{withLabel}</p>
        </div>
      </div>
    </MarketingCard>
  );
}

export function WorkflowPipeline({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-3">
          <div className="flex min-w-[7rem] flex-col items-center rounded-xl border border-border bg-card px-4 py-3 text-center shadow-ds-soft">
            <span className="mb-1 flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="text-sm font-medium text-foreground">{step}</span>
          </div>
          {i < steps.length - 1 ? (
            <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FeatureShowcase({
  eyebrow,
  title,
  description,
  bullets,
  children,
  reverse = false,
  variant = "default",
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  children: ReactNode;
  reverse?: boolean;
  variant?: "default" | "muted" | "white";
  id?: string;
}) {
  return (
    <MarketingSection variant={variant} id={id}>
      <div
        className={cn(
          "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
          reverse && "lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1",
        )}
      >
        <div>
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            align="left"
            className="mb-8"
          />
          <FeatureList items={bullets} />
        </div>
        <div className="relative">{children}</div>
      </div>
    </MarketingSection>
  );
}
