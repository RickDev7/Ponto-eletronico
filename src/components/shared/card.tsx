import {
  Card as ShadcnCard,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SharedVariant, WithClassName } from "./types";

export interface CardProps
  extends WithClassName,
    Omit<React.ComponentProps<typeof ShadcnCard>, "size"> {
  variant?: SharedVariant | "elevated";
  /** Adds hover/focus ring for clickable cards. */
  interactive?: boolean;
  padding?: "none" | "sm" | "default";
}

const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "rounded-md border border-border/70 bg-card/40 shadow-none",
  muted: "rounded-md border border-border/60 bg-muted/20 shadow-none",
  outline: "rounded-md border border-border/50 bg-transparent shadow-none",
  ghost: "border-0 bg-transparent shadow-none",
  elevated: "rounded-md border border-border/70 bg-card/40 shadow-none",
};

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "[--card-spacing:0]",
  sm: "[--card-spacing:--spacing(3)]",
  default: "",
};

export function Card({
  variant = "default",
  interactive = false,
  padding = "default",
  className,
  ...props
}: CardProps) {
  return (
    <ShadcnCard
      className={cn(
        variantStyles[variant],
        paddingStyles[padding],
        interactive &&
          "cursor-pointer transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
};
