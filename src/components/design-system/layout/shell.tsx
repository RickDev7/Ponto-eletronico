"use client";

import { cn } from "@/lib/utils";
import { SidebarProvider } from "./sidebar-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppShellLayoutProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultSidebarCollapsed?: boolean;
}

/** Root application frame — sidebar, header and scrollable main column. */
export function AppShellLayout({
  sidebar,
  header,
  footer,
  children,
  className,
  defaultSidebarCollapsed = false,
}: AppShellLayoutProps) {
  return (
    <SidebarProvider defaultCollapsed={defaultSidebarCollapsed}>
      <TooltipProvider delay={0}>
        <div
          className={cn(
            "flex h-[100dvh] overflow-hidden bg-background text-foreground",
            className,
          )}
        >
          {sidebar}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {header}
            {children}
            {footer}
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
