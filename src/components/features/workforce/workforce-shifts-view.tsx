"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import { moveShiftAction } from "@/actions/workforce/actions";
import type { ShiftRow } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface WorkforceShiftsViewProps {
  slug: string;
  shifts: ShiftRow[];
  employees: Array<{ id: string; full_name: string }>;
  view: "day" | "week" | "month";
  rangeLabel: string;
  dates: string[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
  canWrite: boolean;
  embedded?: boolean;
  viewHref?: (params: { view: "day" | "week" | "month"; week: string }) => string;
  highlightEmployeeId?: string | null;
  selectedAssignmentId?: string | null;
  onShiftSelect?: (shift: ShiftRow) => void;
  detailed?: boolean;
}

type DragPayload = {
  assignmentId: string;
  employeeId: string;
  scheduledDate: string;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(11, 16);
}

export function WorkforceShiftsView({
  slug,
  shifts,
  employees,
  view,
  rangeLabel,
  dates,
  prevHref,
  nextHref,
  todayHref,
  canWrite,
  embedded = false,
  viewHref,
  highlightEmployeeId = null,
  selectedAssignmentId = null,
  onShiftSelect,
  detailed = false,
}: WorkforceShiftsViewProps) {
  const t = useTranslations("workforce.shifts");
  const tPlan = useTranslations("workforce.planning.shift");
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const conflicted = shifts.filter((s) => s.conflicts.length > 0);

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, ShiftRow[]>();
    for (const shift of shifts) {
      const key = `${shift.employeeId}:${shift.scheduledDate}`;
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  const employeeRows = useMemo(() => {
    const ids = new Set<string>();
    for (const e of employees) ids.add(e.id);
    for (const s of shifts) ids.add(s.employeeId);
    return [...ids]
      .map((id) => employees.find((e) => e.id === id) ?? { id, full_name: shifts.find((s) => s.employeeId === id)?.employeeName ?? id })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees, shifts]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftRow[]>();
    for (const shift of shifts) {
      const list = map.get(shift.scheduledDate) ?? [];
      list.push(shift);
      map.set(shift.scheduledDate, list);
    }
    return map;
  }, [shifts]);

  function cellKey(employeeId: string, date: string) {
    return `${employeeId}:${date}`;
  }

  function handleDrop(employeeId: string, scheduledDate: string) {
    if (!dragging || !canWrite) return;
    if (dragging.employeeId === employeeId && dragging.scheduledDate === scheduledDate) {
      setDragging(null);
      setDropTarget(null);
      return;
    }

    startTransition(async () => {
      const result = await moveShiftAction(slug, dragging.assignmentId, { employeeId, scheduledDate });
      if (!result.success) toast.error(result.error);
      else toast.success(t("moved"));
      setDragging(null);
      setDropTarget(null);
    });
  }

  function ShiftCard({ shift, compact }: { shift: ShiftRow; compact?: boolean }) {
    const selected = selectedAssignmentId === shift.assignmentId;
    return (
      <div
        role="button"
        tabIndex={0}
        draggable={canWrite && !pending}
        onClick={() => onShiftSelect?.(shift)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onShiftSelect?.(shift);
        }}
        onDragStart={(e) => {
          e.stopPropagation();
          setDragging({
            assignmentId: shift.assignmentId,
            employeeId: shift.employeeId,
            scheduledDate: shift.scheduledDate,
          });
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropTarget(null);
        }}
        className={cn(
          "rounded-md border bg-background p-2 text-xs shadow-sm transition-opacity",
          canWrite && "cursor-grab active:cursor-grabbing",
          onShiftSelect && "cursor-pointer",
          dragging?.assignmentId === shift.assignmentId && "opacity-40",
          shift.conflicts.length > 0 && "border-amber-500/50",
          selected && "border-primary ring-1 ring-primary/30",
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <Link
            href={ROUTES.task(slug, shift.taskId)}
            className="font-medium hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {shift.title}
          </Link>
          {detailed && shift.shiftType && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase">
              {tPlan(`types.${shift.shiftType}` as never)}
            </span>
          )}
        </div>
        {detailed && (
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
          </p>
        )}
        {!compact && (
          <p className="mt-0.5 text-muted-foreground">
            {shift.employeeName}
            {shift.clientName ? ` · ${shift.clientName}` : ""}
            {shift.addressLabel ? ` · ${shift.addressLabel}` : ""}
          </p>
        )}
        {detailed && compact && shift.clientName && (
          <p className="mt-0.5 truncate text-muted-foreground">{shift.clientName}</p>
        )}
        {shift.conflicts.length > 0 && (
          <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700">
            {shift.conflicts.map((c) => t(`conflicts.${c}`)).join(", ")}
          </span>
        )}
      </div>
    );
  }

  function DropCell({
    employeeId,
    date,
    children,
    className,
  }: {
    employeeId: string;
    date: string;
    children: ReactNode;
    className?: string;
  }) {
    const key = cellKey(employeeId, date);
    const isOver = dropTarget === key;

    return (
      <div
        className={cn(
          "min-h-[4rem] border-r border-b p-1 transition-colors last:border-r-0",
          isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
          className,
        )}
        onDragOver={(e) => {
          if (!canWrite) return;
          e.preventDefault();
          setDropTarget(key);
        }}
        onDragLeave={() => setDropTarget((v) => (v === key ? null : v))}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(employeeId, date);
        }}
      >
        {children}
      </div>
    );
  }

  const navActions = (
    <div className="flex items-center gap-2">
      <Link href={prevHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
        <ChevronLeft className="size-4" />
      </Link>
      <Link href={todayHref} className="rounded-lg border px-3 py-1 text-xs font-medium">
        {t("today")}
      </Link>
      <Link href={nextHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
        <ChevronRight className="size-4" />
      </Link>
      <div className="ml-2 flex rounded-lg border p-0.5 text-xs">
        {(["day", "week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={
              viewHref
                ? viewHref({ view: v, week: dates[0] })
                : ROUTES.workforceShifts(slug, { view: v, week: dates[0] })
            }
            className={cn("rounded-md px-2.5 py-1", view === v && "bg-primary text-primary-foreground")}
          >
            {t(`views.${v}`)}
          </Link>
        ))}
      </div>
    </div>
  );

  const calendarBody = (
    <>
      {conflicted.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="size-4 text-amber-600" />
          {t("conflictsAlert", { count: conflicted.length })}
        </div>
      )}
      {canWrite && (
        <p className="mb-3 text-xs text-muted-foreground">{t("dragHint")}</p>
      )}
      <OperationsWorkspace className={embedded ? "border-0 shadow-none p-0" : undefined}>
        {shifts.length === 0 && view !== "week" ? (
          <EmptyState icon={CalendarRange} title={t("empty.title")} description={t("empty.description")} />
        ) : view === "week" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid border-b" style={{ gridTemplateColumns: `140px repeat(${dates.length}, minmax(100px, 1fr))` }}>
                <div className="border-r p-2 text-xs font-medium text-muted-foreground">{t("employee")}</div>
                {dates.map((date) => (
                  <div key={date} className="border-r p-2 text-center text-xs font-medium last:border-r-0">
                    {date.slice(5)}
                  </div>
                ))}
              </div>
              {employeeRows.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{t("empty.description")}</p>
              ) : (
                employeeRows.map((emp) => (
                  <div
                    key={emp.id}
                    className={cn(
                      "grid transition-opacity",
                      highlightEmployeeId && emp.id !== highlightEmployeeId && "opacity-35",
                    )}
                    style={{ gridTemplateColumns: `140px repeat(${dates.length}, minmax(100px, 1fr))` }}
                  >
                    <div className="border-r border-b p-2 text-xs font-medium">{emp.full_name}</div>
                    {dates.map((date) => (
                      <DropCell key={date} employeeId={emp.id} date={date}>
                        <div className="space-y-1">
                          {(shiftsByCell.get(cellKey(emp.id, date)) ?? []).map((shift) => (
                            <ShiftCard key={shift.assignmentId} shift={shift} compact />
                          ))}
                        </div>
                      </DropCell>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : view === "day" ? (
          <div className="space-y-4 p-4">
            {employeeRows.map((emp) => {
              const dayShifts = shiftsByCell.get(cellKey(emp.id, dates[0])) ?? [];
              return (
                <section key={emp.id}>
                  <h3 className="mb-2 text-sm font-semibold">{emp.full_name}</h3>
                  <DropCell employeeId={emp.id} date={dates[0]} className="rounded-lg border">
                    {dayShifts.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">{t("noShiftsDay")}</p>
                    ) : (
                      <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
                        {dayShifts.map((shift) => (
                          <ShiftCard key={shift.assignmentId} shift={shift} />
                        ))}
                      </div>
                    )}
                  </DropCell>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="divide-y">
            {dates.map((date) => {
              const dayShifts = shiftsByDate.get(date) ?? [];
              return (
                <section
                  key={date}
                  className={cn(
                    "p-4 transition-colors",
                    dropTarget === `month:${date}` && "bg-primary/5",
                  )}
                  onDragOver={(e) => {
                    if (!canWrite || !dragging) return;
                    e.preventDefault();
                    setDropTarget(`month:${date}`);
                  }}
                  onDragLeave={() => setDropTarget((v) => (v === `month:${date}` ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragging) handleDrop(dragging.employeeId, date);
                  }}
                >
                  <h3 className="mb-3 text-sm font-semibold">{date}</h3>
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("noShiftsDay")}</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {dayShifts.map((shift) => (
                        <ShiftCard key={shift.assignmentId} shift={shift} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </OperationsWorkspace>
    </>
  );

  if (embedded) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{rangeLabel}</p>
          {navActions}
        </div>
        {calendarBody}
      </div>
    );
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={rangeLabel} actions={navActions} />
      {calendarBody}
    </OperationsPage>
  );
}
