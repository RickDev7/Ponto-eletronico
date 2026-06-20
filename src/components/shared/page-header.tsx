import { cn } from "@/lib/utils";
import type { SharedSize, WithActions, WithClassName } from "./types";

export interface PageHeaderProps
  extends WithClassName,
    WithActions,
    Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  footer?: React.ReactNode;
  size?: SharedSize;
  /** Stripe-style: title + description on one line. */
  compact?: boolean;
}

const titleSize: Record<SharedSize, string> = {
  sm: "text-sm font-medium tracking-tight",
  md: "text-base font-semibold tracking-tight",
  lg: "text-lg font-semibold tracking-tight",
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  footer,
  size = "sm",
  compact = false,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && (
          <div className="mb-1 text-muted-foreground">{breadcrumbs}</div>
        )}
        {compact && description ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className={cn(titleSize[size], "text-foreground")}>{title}</h1>
            <span className="hidden text-border sm:inline">·</span>
            <p className="text-[12px] text-muted-foreground">{description}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <h1 className={cn(titleSize[size], "text-foreground")}>{title}</h1>
            {description && (
              <p className="text-[12px] text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {footer && <div className="mt-2">{footer}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {actions}
        </div>
      )}
    </header>
  );
}
