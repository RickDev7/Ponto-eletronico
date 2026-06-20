"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "./badge";
import type { StatusTone, WithClassName } from "./types";

export interface StatusBadgeProps
  extends WithClassName,
    Omit<BadgeProps, "variant" | "dot"> {
  status: StatusTone;
  label?: string;
  showDot?: boolean;
}

const toneStyles: Record<StatusTone, string> = {
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger:
    "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-primary/25 bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
  pending:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const t = useTranslations("common.statusTones");
  const text = children ?? label ?? t(status);

  return (
    <Badge
      variant="outline"
      dot={showDot}
      className={cn(toneStyles[status], className)}
      {...props}
    >
      {text}
    </Badge>
  );
}

export type { StatusTone };
