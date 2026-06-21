"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Car, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import { moveShiftAction } from "@/actions/workforce/actions";
import type { ShiftRow } from "@/lib/workforce/workforce-data";
import type { AbsenceRow, VacationRequestRow } from "@/lib/workforce/workforce-data";
import {
  formatMinutes,
  isEmployeeBlockedOnDate,
  type EmployeePlanningCard,
} from "@/lib/workforce/planning-data";
import { OperationsWorkspace } from "@/components/shared";
import { cn } from "@/lib/utils";

interface PlanningGridProps {
  slug: string;
  shifts: ShiftRow[];
  employees: Array<{ id: string; full_name: string }>;
  employeeCards: EmployeePlanningCard[];
  vacations: VacationRequestRow[];
  absences: AbsenceRow[];
  view: "day" | "week" | "month";
  rangeLabel: string;
  dates: string[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
  canWrite: boolean;
  viewHref: (params: { view: "day" | "week" | "month"; week: string }) => string;
  highlightEmployeeId?: string | null;
  selectedAssignmentId?: string | null;
  onShiftSelect?: (shift: ShiftRow) => void;
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

const BLOCKED_CELL: Record<string, string> = {
  vacation: "bg-sky-500/10",
  sick: "bg-rose-500/10",
  absence: "bg-amber-500/10",
};

export function PlanningGrid({
  slug,
  shifts,
  employees,
  employeeCards,
  vacations,
  absences,
  view,
  rangeLabel,
  dates,
  prevHref,
  nextHref,
  todayHref,
  canWrite,
  viewHref,
  highlightEmployeeId = null,
  selectedAssignmentId = null,
  onShiftSelect,
}: PlanningGridProps) {
  const t = useTranslations("workforce.shifts");
  const tPlan = useTranslations("workforce.planning");
  const tGrid = useTranslations("workforce.planning.grid");
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const conflicted = shifts.filter((s) => s.conflicts.length > 0);

  const cardById = useMemo(
    () => new Map(employeeCards.map((c) => [c.id, c])),
    [employeeCards],
  );

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
      .map(
        (id) =>
          employees.find((e) => e.id === id) ?? {
            id,
            full_name: shifts.find((s) => s.employeeId === id)?.employeeName ?? id,
          },
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees, shifts]);

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

    const blocked = isEmployeeBlockedOnDate(employeeId, scheduledDate, vacations, absences);
    if (blocked) {
      toast.error(tGrid(`blocked.${blocked}`));
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
          "rounded-md border bg-background p-1.5 text-[10px] shadow-sm transition-opacity",
          canWrite && "cursor-grab active:cursor-grabbing",
          onShiftSelect && "cursor-pointer",
          dragging?.assignmentId === shift.assignmentId && "opacity-40",
          shift.conflicts.length > 0 && "border-amber-500/50",
          selected && "border-primary ring-1 ring-primary/30",
        )}
      >
        <Link
          href={ROUTES.task(slug, shift.taskId)}
          className="block truncate font-medium hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          {shift.title}
        </Link>
        {!compact && (
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)}
          </p>
        )}
        {shift.vehiclePlate && (
          <p className="mt-0.5 flex items-center gap-0.5 text-muted-foreground">
            <Car className="size-2.5 shrink-0" />
            <span className="truncate font-mono">{shift.vehiclePlate}</span>
          </p>
        )}
        {shift.conflicts.length > 0 && (
          <span className="mt-0.5 inline-block rounded-full bg-amber-500/15 px-1 py-0.5 text-[9px] text-amber-700">
            !
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
    const blocked = isEmployeeBlockedOnDate(employeeId, date, vacations, absences);

    return (
      <div
        className={cn(
          "min-h-[3.25rem] border-r border-b p-0.5 transition-colors last:border-r-0",
          blocked && BLOCKED_CELL[blocked],
          isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
          className,
        )}
        onDragOver={(e) => {
          if (!canWrite || blocked) return;
          e.preventDefault();
          setDropTarget(key);
        }}
        onDragLeave={() => setDropTarget((v) => (v === key ? null : v))}
        onDrop={(e) => {
          e.preventDefault();
          if (blocked) return;
          handleDrop(employeeId, date);
        }}
      >
        {blocked && (
          <span className="mb-0.5 block px-0.5 text-[8px] font-medium uppercase text-muted-foreground">
            {tGrid(`markers.${blocked}`)}
          </span>
        )}
        {children}
      </div>
    );
  }

  function EmployeeRowHeader({ empId, name }: { empId: string; name: string }) {
    const card = cardById.get(empId);
    return (
      <div className="sticky left-0 z-10 border-r border-b bg-card p-2">
        <p className="truncate text-xs font-medium">{name}</p>
        {card && (
          <>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  card.workloadPct > 100
                    ? "bg-rose-500"
                    : card.workloadPct > 85
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(card.workloadPct, 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">
              {formatMinutes(card.plannedMinutes)} / {card.weeklyHours}h
            </p>
          </>
        )}
      </div>
    );
  }

  const navActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={prevHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
        <ChevronLeft className="size-4" />
      </Link>
      <Link href={todayHref} className="rounded-lg border px-3 py-1 text-xs font-medium">
        {t("today")}
      </Link>
      <Link href={nextHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
        <ChevronRight className="size-4" />
      </Link>
      <div className="flex rounded-lg border p-0.5 text-xs">
        {(["day", "week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={viewHref({ view: v, week: dates[0] })}
            className={cn("rounded-md px-2.5 py-1", view === v && "bg-primary text-primary-foreground")}
          >
            {t(`views.${v}`)}
          </Link>
        ))}
      </div>
    </div>
  );

  const colWidth = view === "month" ? "minmax(44px, 1fr)" : "minmax(96px, 1fr)";
  const employeeColWidth = view === "month" ? "120px" : "148px";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{tPlan("grid.title")}</p>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        {navActions}
      </div>

      {conflicted.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <AlertTriangle className="size-3.5 text-amber-600" />
          {t("conflictsAlert", { count: conflicted.length })}
        </div>
      )}

      {canWrite && (
        <p className="mb-2 text-[11px] text-muted-foreground">{tPlan("grid.dragHint")}</p>
      )}

      <OperationsWorkspace className="border-0 p-0 shadow-none">
        {view === "day" ? (
          <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-1">
            {employeeRows.map((emp) => {
              const dayShifts = shiftsByCell.get(cellKey(emp.id, dates[0])) ?? [];
              return (
                <section
                  key={emp.id}
                  className={cn(
                    "rounded-lg border transition-opacity",
                    highlightEmployeeId && emp.id !== highlightEmployeeId && "opacity-35",
                  )}
                >
                  <EmployeeRowHeader empId={emp.id} name={emp.full_name} />
                  <DropCell employeeId={emp.id} date={dates[0]} className="rounded-b-lg border-0">
                    {dayShifts.length === 0 ? (
                      canWrite &&
                      !isEmployeeBlockedOnDate(emp.id, dates[0], vacations, absences) ? (
                        <Link
                          href={ROUTES.tasks(slug, {
                            create: true,
                            employee: emp.id,
                            date: dates[0],
                          })}
                          className="flex min-h-[3rem] items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 p-2 text-[10px] text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          <Plus className="size-3.5" />
                          {tPlan("grid.addTask")}
                        </Link>
                      ) : (
                        <p className="p-2 text-[10px] text-muted-foreground">{t("noShiftsDay")}</p>
                      )
                    ) : (
                      <div className="grid gap-1.5 p-1.5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="max-h-[calc(100vh-18rem)] overflow-auto rounded-lg border">
            <div
              className="min-w-max"
              style={{
                display: "grid",
                gridTemplateColumns: `${employeeColWidth} repeat(${dates.length}, ${colWidth})`,
              }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r bg-muted/80 p-2 text-[10px] font-semibold uppercase text-muted-foreground backdrop-blur">
                {t("employee")}
              </div>
              {dates.map((date) => (
                <div
                  key={date}
                  className="sticky top-0 z-10 border-b border-r bg-muted/80 p-1.5 text-center text-[10px] font-medium last:border-r-0 backdrop-blur"
                >
                  {view === "month" ? date.slice(8) : date.slice(5)}
                </div>
              ))}

              {employeeRows.length === 0 ? (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                  {t("empty.description")}
                </div>
              ) : (
                employeeRows.flatMap((emp) => [
                  <div
                    key={`${emp.id}-hdr`}
                    className={cn(
                      highlightEmployeeId && emp.id !== highlightEmployeeId && "opacity-35",
                    )}
                  >
                    <EmployeeRowHeader empId={emp.id} name={emp.full_name} />
                  </div>,
                  ...dates.map((date) => (
                    <div
                      key={`${emp.id}-${date}`}
                      className={cn(
                        highlightEmployeeId && emp.id !== highlightEmployeeId && "opacity-35",
                      )}
                    >
                      <DropCell employeeId={emp.id} date={date}>
                        <div className="space-y-0.5">
                          {(shiftsByCell.get(cellKey(emp.id, date)) ?? []).map((shift) => (
                            <ShiftCard key={shift.assignmentId} shift={shift} compact />
                          ))}
                          {canWrite &&
                            (shiftsByCell.get(cellKey(emp.id, date)) ?? []).length === 0 &&
                            !isEmployeeBlockedOnDate(emp.id, date, vacations, absences) && (
                              <Link
                                href={ROUTES.tasks(slug, {
                                  create: true,
                                  employee: emp.id,
                                  date,
                                })}
                                className="flex min-h-[2rem] items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                                title={tPlan("grid.addTask")}
                              >
                                <Plus className="size-3.5" />
                              </Link>
                            )}
                        </div>
                      </DropCell>
                    </div>
                  )),
                ])
              )}
            </div>
          </div>
        )}
      </OperationsWorkspace>
    </div>
  );
}
