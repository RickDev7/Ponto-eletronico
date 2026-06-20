"use client";

import { useCallback, useEffect, useState } from "react";

export type UiDensity = "comfortable" | "compact";

export const UI_DENSITY_STORAGE_KEY = "feldops-ui-density";

export function applyUiDensity(density: UiDensity) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = density;
}

export function readUiDensity(): UiDensity {
  if (typeof window === "undefined") return "comfortable";
  const stored = localStorage.getItem(UI_DENSITY_STORAGE_KEY);
  return stored === "compact" ? "compact" : "comfortable";
}

export function useUiDensity() {
  const [density, setDensityState] = useState<UiDensity>("comfortable");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readUiDensity();
    setDensityState(initial);
    applyUiDensity(initial);
    setMounted(true);
  }, []);

  const setDensity = useCallback((next: UiDensity) => {
    localStorage.setItem(UI_DENSITY_STORAGE_KEY, next);
    applyUiDensity(next);
    setDensityState(next);
  }, []);

  return { density, setDensity, mounted };
}
