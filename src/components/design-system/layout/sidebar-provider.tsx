"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "feldops-sidebar-collapsed";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
  hydrated: boolean;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function readCollapsed(defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsedState] = React.useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setCollapsedState(readCollapsed(defaultCollapsed));
    setHydrated(true);
  }, [defaultCollapsed]);

  const setCollapsed = React.useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = React.useMemo(
    () => ({
      collapsed: hydrated ? collapsed : defaultCollapsed,
      setCollapsed,
      toggleCollapsed,
      mobileOpen,
      setMobileOpen,
      isMobile,
      hydrated,
    }),
    [
      collapsed,
      defaultCollapsed,
      hydrated,
      isMobile,
      mobileOpen,
      setCollapsed,
      toggleCollapsed,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebarLayout() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebarLayout must be used within SidebarProvider.");
  }
  return ctx;
}
