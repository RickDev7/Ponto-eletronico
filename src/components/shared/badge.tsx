import { Badge as ShadcnBadge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { WithClassName, WithIcon } from "./types";

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

export interface BadgeProps
  extends WithClassName,
    WithIcon,
    Omit<React.ComponentProps<typeof ShadcnBadge>, "variant"> {
  variant?: BadgeVariant;
  /** Renders a small dot before the label. */
  dot?: boolean;
}

export function Badge({
  variant = "default",
  icon: Icon,
  iconClassName,
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <ShadcnBadge variant={variant} className={cn(className)} {...props}>
      {dot && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-current opacity-80"
          aria-hidden
        />
      )}
      {Icon && (
        <Icon className={cn("size-3 shrink-0", iconClassName)} aria-hidden />
      )}
      {children}
    </ShadcnBadge>
  );
}

export { badgeVariants };
