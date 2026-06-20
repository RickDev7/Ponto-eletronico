import { cn } from "@/lib/utils";
import type { WithActions, WithClassName, WithIcon } from "./types";

export interface SectionHeaderProps
  extends WithClassName,
    WithActions,
    WithIcon {
  /** Section title — rendered as `<h2>` by default. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Heading level for accessibility. */
  as?: "h2" | "h3" | "h4";
  /** Border below the header row. */
  bordered?: boolean;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  as: Heading = "h2",
  bordered = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        bordered && "border-b border-border/40 pb-3",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <Heading className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-foreground">
          {Icon && (
            <Icon
              className={cn("size-4 shrink-0 text-muted-foreground", iconClassName)}
              aria-hidden
            />
          )}
          <span className="truncate">{title}</span>
        </Heading>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
