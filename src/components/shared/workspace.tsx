import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WithClassName } from "./types";

/** Standard vertical rhythm for operational pages. */
export const OPERATIONS_PAGE_CLASS = "space-y-2";

/** Standard form spacing inside modals. */
export const OPERATIONS_FORM_CLASS = "space-y-3";

/** Standard row action trigger — reveal on row hover. */
export const ROW_ACTION_TRIGGER_CLASS =
  "inline-flex size-7 items-center justify-center rounded-md opacity-0 transition-all hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Compact filter toolbar surface. */
export const OPERATIONS_FILTER_BAR_CLASS =
  "rounded-lg border border-border bg-card/20 p-2";

/** Unified operations workspace surface — single connected block. */
export function OperationsWorkspace({
  children,
  className,
}: WithClassName & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page-level layout wrapper matching Dashboard rhythm. */
export function OperationsPage({
  children,
  className,
}: WithClassName & { children: React.ReactNode }) {
  return (
    <div className={cn(OPERATIONS_PAGE_CLASS, className)}>{children}</div>
  );
}

/** Section label bar — same pattern as Dashboard operational panels. */
export function WorkspacePanelBar({
  icon: Icon,
  children,
  action,
  className,
}: WithClassName & {
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border px-2.5 py-1",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-3 shrink-0" />}
        {children}
      </span>
      {action}
    </div>
  );
}

/** Attio-style fluid workspace section — spacing over borders. */
export function WorkspaceSection({
  children,
  className,
  title,
  action,
}: WithClassName & {
  children: React.ReactNode;
  title?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(title || action) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Operations data table container — alias kept for list pages. */
export function DataTableShell({
  children,
  className,
}: WithClassName & { children: React.ReactNode }) {
  return (
    <OperationsWorkspace className={className}>{children}</OperationsWorkspace>
  );
}

/** Dense operational list row. */
export function DataRow({
  children,
  className,
  interactive = false,
  ...props
}: WithClassName &
  React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center gap-2 border-b border-border px-2.5 py-1 text-[12px] last:border-b-0",
        interactive && "cursor-pointer transition-colors hover:bg-muted/30",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Inline section divider label inside operational lists. */
export function DataSectionLabel({
  children,
  className,
}: WithClassName & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border-b border-border bg-muted/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact filter toolbar wrapper. */
export function OperationsFilterBar({
  children,
  className,
}: WithClassName & { children: React.ReactNode }) {
  return (
    <div className={cn(OPERATIONS_FILTER_BAR_CLASS, className)}>{children}</div>
  );
}
