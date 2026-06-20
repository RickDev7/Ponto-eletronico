import { cn } from "@/lib/utils";
import type { SharedSize, WithClassName, WithIcon } from "./types";

export interface EmptyStateProps extends WithClassName, WithIcon {
  title: string;
  description?: string;
  /** Primary action slot (button, link, etc.). */
  action?: React.ReactNode;
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
            "mb-3 flex items-center justify-center rounded-lg border border-border/60 bg-muted/20",
            iconBoxSize[size],
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground/60",
              iconSize[size],
              iconClassName,
            )}
            aria-hidden
          />
        </div>
      )}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
