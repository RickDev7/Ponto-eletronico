"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";

/** Read a CSS custom property from :root (works with oklch/hex tokens). */
export function getCssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface ChartThemeColors {
  grid: string;
  axis: string;
  label: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export function readChartTheme(): ChartThemeColors {
  return {
    grid: getCssVar("--border", "#E2E8F0"),
    axis: getCssVar("--muted-foreground", "#64748B"),
    label: getCssVar("--foreground", "#0F172A"),
    tooltipBg: getCssVar("--card", "#FFFFFF"),
    tooltipBorder: getCssVar("--border", "#E2E8F0"),
    tooltipText: getCssVar("--card-foreground", "#0F172A"),
    primary: getCssVar("--primary", "#2563EB"),
    success: getCssVar("--success", "#22C55E"),
    warning: getCssVar("--warning", "#F59E0B"),
    danger: getCssVar("--destructive", "#EF4444"),
    chart1: getCssVar("--chart-1", "#2563EB"),
    chart2: getCssVar("--chart-2", "#22C55E"),
    chart3: getCssVar("--chart-3", "#F59E0B"),
    chart4: getCssVar("--chart-4", "#F97316"),
    chart5: getCssVar("--chart-5", "#EF4444"),
  };
}

export function useChartTheme(): ChartThemeColors {
  const { resolvedTheme } = useTheme();
  return useMemo(() => readChartTheme(), [resolvedTheme]);
}

export function chartTooltipStyle(colors: ChartThemeColors) {
  return {
    contentStyle: {
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: "8px",
      fontSize: "12px",
      color: colors.tooltipText,
    },
    labelStyle: { color: colors.axis },
  };
}
