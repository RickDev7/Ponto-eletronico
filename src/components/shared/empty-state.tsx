import { cn } from "@/lib/utils";
import type { SharedSize, WithClassName, WithIcon } from "./types";

export interface EmptyStateProps extends WithClassName, WithIcon {
  title: string;
  description?: string;
  /** Primary action slot (button, link, etc.). */
  action?: React.ReactNode;
  /** Secondary action below primary. */
  secondaryAction?: React.ReactNode;
  /** Additional content below the action. */
  children?: React.ReactNode;
  size?: SharedSize;
}

const containerPadding: Record<SharedSize, string> = {
  sm: "py-6",
  md: "py-10",
  lg: "py-16",
};

const iconBoxSize: Record<SharedSize, string> = {
  sm: "size-9",
  md: "size-11",
  lg: "size-14",
};

const iconSize: Record<SharedSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function EmptyState({
  icon: Icon,
  iconClassName,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        containerPadding[size],
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-xl border border-border bg-muted/30",
            iconBoxSize[size],
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground/70",
              iconSize[size],
              iconClassName,
            )}
            aria-hidden
          />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
