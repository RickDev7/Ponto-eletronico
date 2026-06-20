import type { LucideIcon } from "lucide-react";

/** Shared size scale used across the component library. */
export type SharedSize = "sm" | "md" | "lg";

/** Visual emphasis levels for surfaces and badges. */
export type SharedVariant = "default" | "muted" | "outline" | "ghost";

/** Semantic status tones for StatusBadge. */
export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "pending";

/** KPI trend direction indicator. */
export type TrendDirection = "up" | "down" | "neutral";

export interface TrendIndicator {
  value: number | string;
  direction: TrendDirection;
  label?: string;
}

export interface WithClassName {
  className?: string;
}

export interface WithIcon {
  icon?: LucideIcon;
  iconClassName?: string;
}

export interface WithActions {
  actions?: React.ReactNode;
}
