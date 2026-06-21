"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarLayout } from "./sidebar-provider";

const SIDEBAR_WIDTH = "15rem";
const SIDEBAR_WIDTH_ICON = "3rem";

function SidebarRoot({
  className,
  children,
  ...props
}: React.ComponentProps<"aside">) {
  const { collapsed, isMobile, mobileOpen, setMobileOpen, hydrated } = useSidebarLayout();
  const effectiveCollapsed = hydrated && collapsed;

  const inner = (
    <div className="flex h-full flex-col">{children}</div>
  );

  if (hydrated && isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[min(18rem,100vw)] gap-0 border-r border-border/60 p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {inner}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-collapsed={effectiveCollapsed ? "true" : "false"}
      style={{ width: effectiveCollapsed ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH }}
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-200 ease-out lg:flex",
        className,
      )}
      {...props}
    >
      {inner}
    </aside>
  );
}

function SidebarHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { collapsed, hydrated } = useSidebarLayout();
  const effectiveCollapsed = hydrated && collapsed;

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center",
        effectiveCollapsed ? "justify-center px-1" : "px-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overscroll-contain px-1 py-1 scrollbar-thin",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { collapsed, hydrated } = useSidebarLayout();
  const effectiveCollapsed = hydrated && collapsed;

  return (
    <div
      className={cn(
        "shrink-0 px-1 py-1",
        effectiveCollapsed && "flex justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarGroup({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  const { collapsed, hydrated } = useSidebarLayout();
  const effectiveCollapsed = hydrated && collapsed;

  return (
    <div className={cn("space-y-0.5", className)} {...props}>
      {label && !effectiveCollapsed && (
        <p className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

interface SidebarNavItemProps {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  badge?: React.ReactNode;
  onNavigate?: () => void;
}

function SidebarNavGroup({
  icon: Icon,
  label,
  basePath,
  items,
  pathname,
  onNavigate,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  basePath: string;
  items: Array<{ titleKey: string; path: string; label: string }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { collapsed, isMobile, setMobileOpen, hydrated } = useSidebarLayout();
  const isGroupActive = pathname.startsWith(basePath);
  const [open, setOpen] = React.useState(isGroupActive);
  const showCollapsed = hydrated && collapsed && !isMobile;

  React.useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  if (showCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={basePath}
              onClick={() => {
                onNavigate?.();
                if (isMobile) setMobileOpen(false);
              }}
              className={cn(
                "mx-auto flex size-7 items-center justify-center rounded-md transition-colors",
                isGroupActive
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
            </Link>
          }
        />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-0.5 text-left transition-colors",
          isGroupActive
            ? "bg-muted/50 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-xs">{label}</span>
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="ml-2 space-y-0.5 border-l border-border/60 pl-2">
          {items.map((child) => {
            const isActive =
              pathname === child.path ||
              (child.path !== basePath && pathname.startsWith(child.path));
            return (
              <Link
                key={child.path}
                href={child.path}
                onClick={() => {
                  onNavigate?.();
                  if (isMobile) setMobileOpen(false);
                }}
                className={cn(
                  "block rounded-md px-2 py-1 text-xs transition-colors",
                  isActive
                    ? "bg-muted/80 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive = false,
  badge,
  onNavigate,
}: SidebarNavItemProps) {
  const { collapsed, isMobile, setMobileOpen, hydrated } = useSidebarLayout();
  const effectiveCollapsed = hydrated && collapsed;
  const showCollapsed = effectiveCollapsed && !isMobile;

  const className = cn(
    "group/nav relative flex items-center gap-2 rounded-md transition-colors",
    effectiveCollapsed ? "mx-auto size-7 justify-center p-0" : "px-2 py-0.5",
    isActive
      ? "bg-muted/80 font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
  );

  const content = (
    <>
      {Icon && (
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            isActive
              ? "text-sidebar-primary"
              : "text-muted-foreground group-hover/nav:text-foreground",
          )}
        />
      )}
      {!effectiveCollapsed && (
        <>
          <span className="flex-1 truncate text-xs">{label}</span>
          {badge}
        </>
      )}
      {isActive && !effectiveCollapsed && (
        <span className="absolute inset-y-1 left-0 w-px rounded-full bg-primary" />
      )}
    </>
  );

  const link = (
    <Link
      href={href}
      onClick={() => {
        onNavigate?.();
        if (isMobile) setMobileOpen(false);
      }}
      className={className}
    >
      {content}
    </Link>
  );

  if (showCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarCollapseTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { collapsed, toggleCollapsed } = useSidebarLayout();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={collapsed ? "Sidebar erweitern" : "Sidebar einklappen"}
      onClick={toggleCollapsed}
      className={cn("hidden text-muted-foreground lg:inline-flex", className)}
      {...props}
    >
      {collapsed ? (
        <PanelLeftOpen className="size-4" />
      ) : (
        <PanelLeftClose className="size-4" />
      )}
    </Button>
  );
}

function SidebarMobileTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setMobileOpen } = useSidebarLayout();
  const t = useTranslations("navigation");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t("openMenu")}
      onClick={() => setMobileOpen(true)}
      className={cn("lg:hidden", className)}
      {...props}
    >
      <PanelLeftOpen className="size-4" />
    </Button>
  );
}

function SidebarSeparator({ className }: { className?: string }) {
  return <div className={cn("my-2 h-px bg-border/60", className)} />;
}

export {
  SidebarRoot as Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarNavItem,
  SidebarNavGroup,
  SidebarCollapseTrigger,
  SidebarMobileTrigger,
  SidebarSeparator,
};
