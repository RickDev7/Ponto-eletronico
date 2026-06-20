"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Plus,
  User,
  Users,
  Zap,
  CalendarClock,
  AlertTriangle,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { ServiceType, TaskStatus } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OperationsPage, OperationsWorkspace } from "@/components/shared/workspace";
import { KpiCard } from "@/components/shared/kpi-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

type ViewMode = "day" | "week" | "month";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTask = any;

interface CalendarViewProps {
  slug: string;
  tasks: AnyTask[];
  year: number;
  month: number;
  today: string;
}

const STATUS_STYLES: Record<
  TaskStatus | "delayed",
  { border: string; bg: string; dot: string }
> = {
  draft: {
    border: "border-l-muted-foreground/40",
    bg: "bg-muted/25",
    dot: "bg-muted-foreground/50",
  },
  scheduled: {
    border: "border-l-blue-500/50",
    bg: "bg-blue-500/[0.07]",
    dot: "bg-blue-500/70",
  },
  in_progress: {
    border: "border-l-amber-500/50",
    bg: "bg-amber-500/[0.07]",
    dot: "bg-amber-500/70",
  },
  completed: {
    border: "border-l-emerald-500/50",
    bg: "bg-emerald-500/[0.07]",
    dot: "bg-emerald-500/70",
  },
  cancelled: {
    border: "border-l-destructive/30",
    bg: "bg-destructive/[0.05]",
    dot: "bg-destructive/50",
  },
  delayed: {
    border: "border-l-red-500/50",
    bg: "bg-red-500/[0.07]",
    dot: "bg-red-500/70",
  },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIso(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function getAddress(task: AnyTask) {
  return Array.isArray(task.address) ? task.address[0] : task.address;
}

function getEmployees(task: AnyTask): string[] {
  const assignments = Array.isArray(task.assignments) ? task.assignments : [];
  return assignments
    .map((a: AnyTask) => {
      const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
      return emp?.full_name as string | undefined;
    })
    .filter(Boolean);
}

function isOpenStatus(status: string) {
  return ["draft", "scheduled", "in_progress"].includes(status);
}

function isOverdue(task: AnyTask, today: string) {
  return isOpenStatus(task.status) && task.scheduled_date < today;
}

function taskVisualStatus(task: AnyTask, today: string): TaskStatus | "delayed" {
  if (isOverdue(task, today)) return "delayed";
  return task.status as TaskStatus;
}

function formatDuration(task: AnyTask, allDayLabel: string) {
  if (task.scheduled_start) return task.scheduled_start.slice(0, 5);
  return allDayLabel;
}

function timeBucket(start: string | null): "morning" | "afternoon" | "evening" {
  if (!start) return "morning";
  const hour = parseInt(start.slice(0, 2), 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const TIME_BUCKET_KEYS = ["morning", "afternoon", "evening"] as const;

export function CalendarView({ slug, tasks, year, month, today }: CalendarViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("calendar.planning");
  const tViews = useTranslations("calendar.views");
  const tNav = useTranslations("calendar.navigation");
  const tWeekdays = useTranslations("calendar.weekdays");
  const tMonths = useTranslations("calendar.months");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms");
  const [view, setView] = useState<ViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => {
    const t = parseIso(today);
    if (t.getFullYear() === year && t.getMonth() + 1 === month) return t;
    return new Date(year, month - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);

  useEffect(() => {
    const t = parseIso(today);
    if (t.getFullYear() === year && t.getMonth() + 1 === month) {
      setAnchorDate(t);
    } else {
      setAnchorDate(new Date(year, month - 1, 1));
    }
  }, [year, month, today]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false;
      if (serviceFilter && task.service_type !== serviceFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, serviceFilter]);

  const tasksByDate = useMemo(() => {
    return filteredTasks.reduce<Record<string, AnyTask[]>>((acc, task) => {
      const d = task.scheduled_date as string;
      if (!acc[d]) acc[d] = [];
      acc[d].push(task);
      return acc;
    }, {});
  }, [filteredTasks]);

  const todayTasks = tasksByDate[today] ?? [];
  const unassignedTasks = useMemo(
    () =>
      filteredTasks.filter(
        (t) =>
          isOpenStatus(t.status) &&
          getEmployees(t).length === 0,
      ),
    [filteredTasks],
  );

  const todayEmployees = useMemo(() => {
    const names = new Set<string>();
    todayTasks.forEach((t) => getEmployees(t).forEach((n) => names.add(n)));
    return [...names].sort();
  }, [todayTasks]);

  const metrics = useMemo(() => {
    const scheduled = filteredTasks.filter((t) => t.status === "scheduled").length;
    const openSlots = filteredTasks.filter(
      (t) => t.status === "scheduled" && getEmployees(t).length === 0,
    ).length;
    const overdue = filteredTasks.filter((t) => isOverdue(t, today)).length;
    return {
      scheduled,
      openSlots,
      employeesAvailable: todayEmployees.length,
      overdue,
    };
  }, [filteredTasks, today, todayEmployees.length]);

  function navigateMonth(dir: -1 | 1) {
    let m = month + dir;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    router.push(`/${slug}/calendar?month=${m}&year=${y}`);
  }

  function goToDate(d: Date) {
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    setAnchorDate(d);
    setSelectedDate(toIso(d));
    if (m !== month || y !== year) {
      router.push(`/${slug}/calendar?month=${m}&year=${y}`);
    }
  }

  function navigatePeriod(dir: -1 | 1) {
    if (view === "month") {
      navigateMonth(dir);
      return;
    }
    const step = view === "day" ? 1 : 7;
    const next = addDays(anchorDate, dir * step);
    goToDate(next);
  }

  function goToday() {
    const n = parseIso(today);
    goToDate(n);
  }

  const weekStart = startOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = t("weekLabel", {
    week: getWeekNumber(anchorDate),
    start: weekStart.getDate(),
    end: addDays(weekStart, 6).getDate(),
    month: tMonths(MONTH_KEYS[weekStart.getMonth()]),
  });

  const activeFilterCount =
    statusFilter.size + (serviceFilter ? 1 : 0);

  const serviceTypes = useMemo(
    () => [...new Set(tasks.map((t) => t.service_type as string))],
    [tasks],
  );

  return (
    <OperationsPage className="pb-4">
      {/* ── Top planning header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {view === "month" && `${tMonths(MONTH_KEYS[month - 1])} ${year}`}
            {view === "week" && weekLabel}
            {view === "day" &&
              anchorDate.toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border/70 bg-card/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => navigatePeriod(-1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={goToday}
            >
              {tNav("today")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => navigatePeriod(1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center rounded-lg border border-border/70 bg-card/30 p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  view === v
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tViews(v)}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 gap-1 text-[11px]",
              )}
            >
              <Filter className="size-3" />
              {t("filter")}
              {activeFilterCount > 0 && (
                <span className="rounded bg-muted px-1 text-[10px] tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{tForms("labels.status")}</p>
              <div className="space-y-0.5">
                {(["scheduled", "in_progress", "completed", "draft"] as TaskStatus[]).map(
                  (s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={statusFilter.has(s)}
                        onCheckedChange={(checked) => {
                          setStatusFilter((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(s);
                            else next.delete(s);
                            return next;
                          });
                        }}
                      />
                      {tStatus(s)}
                    </label>
                  ),
                )}
              </div>
              <p className="mb-1.5 mt-2 text-[11px] font-medium text-muted-foreground">
                {t("serviceType")}
              </p>
              <div className="space-y-0.5">
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-muted/50">
                  <Checkbox
                    checked={!serviceFilter}
                    onCheckedChange={() => setServiceFilter(null)}
                  />
                  {tCommon("all")}
                </label>
                {serviceTypes.map((st) => (
                  <label
                    key={st}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={serviceFilter === st}
                      onCheckedChange={(checked) =>
                        setServiceFilter(checked ? st : null)
                      }
                    />
                    {tServiceTypes(st as ServiceType)}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Link
            href={`/${slug}/tasks?status=draft`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 gap-1 text-[11px]",
            )}
          >
            <Zap className="size-3" />
            {t("quickPlan")}
          </Link>
          <Link
            href={`/${slug}/tasks`}
            className={cn(buttonVariants({ size: "sm" }), "h-7 gap-1 text-[11px]")}
          >
            <Plus className="size-3" />
            {t("newTask")}
          </Link>
        </div>
      </div>

      {/* ── Operations overview strip ───────────────────────────────────── */}
      <OperationsWorkspace>
        <div className="grid grid-cols-2 divide-x divide-border/60 border-b border-border/60 lg:grid-cols-4">
          <KpiCard
            variant="strip"
            label={t("kpis.scheduled")}
            value={metrics.scheduled}
            icon={CalendarClock}
            href={`/${slug}/tasks?status=scheduled`}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.openSlots")}
            value={metrics.openSlots}
            icon={LayoutGrid}
            hint={t("kpis.openSlotsHint")}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.teamToday")}
            value={metrics.employeesAvailable}
            icon={Users}
            hint={t("kpis.teamTodayHint")}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.overdue")}
            value={metrics.overdue}
            icon={AlertTriangle}
            iconClassName="text-red-500/70"
            href={`/${slug}/tasks`}
          />
        </div>
      </OperationsWorkspace>

      {/* ── Main layout: calendar + planning panel ──────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1fr_280px]">
        <OperationsWorkspace className="shadow-sm">
          {view === "month" && (
            <MonthGrid
              slug={slug}
              year={year}
              month={month}
              today={today}
              tasksByDate={tasksByDate}
              selectedDate={selectedDate}
              hoveredSlot={hoveredSlot}
              onSelectDate={setSelectedDate}
              onHoverSlot={setHoveredSlot}
            />
          )}
          {view === "week" && (
            <WeekGrid
              slug={slug}
              today={today}
              weekDays={weekDays}
              tasksByDate={tasksByDate}
              selectedDate={selectedDate}
              hoveredSlot={hoveredSlot}
              onSelectDate={setSelectedDate}
              onHoverSlot={setHoveredSlot}
            />
          )}
          {view === "day" && (
            <DayTimeline
              slug={slug}
              today={today}
              date={toIso(anchorDate)}
              tasks={tasksByDate[toIso(anchorDate)] ?? []}
              hoveredSlot={hoveredSlot}
              onHoverSlot={setHoveredSlot}
            />
          )}
        </OperationsWorkspace>

        <PlanningPanel
          slug={slug}
          today={today}
          todayTasks={todayTasks}
          todayEmployees={todayEmployees}
          unassignedTasks={unassignedTasks}
        />
      </div>
    </OperationsPage>
  );
}

/* ── Task card ─────────────────────────────────────────────────────────── */

function TaskCard({
  slug,
  task,
  today,
  compact = false,
}: {
  slug: string;
  task: AnyTask;
  today: string;
  compact?: boolean;
}) {
  const t = useTranslations("calendar.planning");
  const tServiceTypes = useTranslations("serviceTypes");
  const visual = taskVisualStatus(task, today);
  const style = STATUS_STYLES[visual] ?? STATUS_STYLES.scheduled;
  const addr = getAddress(task);
  const employees = getEmployees(task);
  const service = tServiceTypes(task.service_type as ServiceType);

  return (
    <Link
      href={`/${slug}/tasks/${task.id}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group/card block rounded-md border border-border/50 border-l-2 transition-all duration-200",
        "hover:-translate-y-px hover:border-border hover:shadow-sm",
        "active:scale-[0.99] active:shadow-none",
        style.border,
        style.bg,
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={cn(
            "min-w-0 flex-1 truncate font-medium leading-tight",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {task.title}
        </p>
        <span
          className={cn("mt-1 size-1.5 shrink-0 rounded-full", style.dot)}
        />
      </div>
      {!compact && (
        <>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {service}
          </p>
          {addr?.city && (
            <p className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] text-muted-foreground">
              <MapPin className="size-2.5 shrink-0 opacity-60" />
              {addr.city}
            </p>
          )}
          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="flex items-center gap-0.5 truncate text-[10px] text-muted-foreground">
              <User className="size-2.5 shrink-0 opacity-60" />
              {employees.length > 0 ? employees[0] : t("unassigned")}
              {employees.length > 1 && ` +${employees.length - 1}`}
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
              <Clock className="size-2.5 opacity-60" />
              {formatDuration(task, t("allDay"))}
            </span>
          </div>
        </>
      )}
    </Link>
  );
}

/* ── Month grid ────────────────────────────────────────────────────────── */

function MonthGrid({
  slug,
  year,
  month,
  today,
  tasksByDate,
  selectedDate,
  hoveredSlot,
  onSelectDate,
  onHoverSlot,
}: {
  slug: string;
  year: number;
  month: number;
  today: string;
  tasksByDate: Record<string, AnyTask[]>;
  selectedDate: string | null;
  hoveredSlot: string | null;
  onSelectDate: (d: string | null) => void;
  onHoverSlot: (d: string | null) => void;
}) {
  const tWeekdays = useTranslations("calendar.weekdays");
  const t = useTranslations("calendar.planning");
  const tStatus = useTranslations("status");
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isoForDay(day: number) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return (
    <>
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/15">
        {WEEKDAY_KEYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {tWeekdays(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[88px] border-b border-r border-border/40 bg-muted/5 last:border-r-0 sm:min-h-[108px]"
              />
            );
          }
          const iso = isoForDay(day);
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const isHovered = iso === hoveredSlot;
          const isWeekend = (startDow + day - 1) % 7 >= 5;

          return (
            <div
              key={iso}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(isSelected ? null : iso)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(isSelected ? null : iso);
                }
              }}
              onMouseEnter={() => onHoverSlot(iso)}
              onMouseLeave={() => onHoverSlot(null)}
              className={cn(
                "min-h-[88px] cursor-pointer border-b border-r border-border/40 p-1 transition-all duration-200 last:border-r-0 sm:min-h-[108px] sm:p-1.5",
                isWeekend && "bg-muted/[0.03]",
                isHovered && "bg-muted/25",
                isSelected && "bg-primary/[0.04] ring-1 ring-inset ring-primary/20",
              )}
            >
              <div
                className={cn(
                  "mb-1 inline-flex size-5 items-center justify-center rounded-full text-[10px] font-medium tabular-nums transition-colors",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && "text-muted-foreground",
                )}
              >
                {day}
              </div>
              <div className="hidden flex-col gap-0.5 sm:flex">
                {dayTasks.slice(0, 2).map((task) => (
                  <TaskCard key={task.id} slug={slug} task={task} today={today} compact />
                ))}
                {dayTasks.length > 2 && (
                  <span className="px-1 text-[9px] text-muted-foreground">
                    {t("moreTasks", { count: dayTasks.length - 2 })}
                  </span>
                )}
              </div>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 sm:hidden">
                  {dayTasks.slice(0, 3).map((task) => {
                    const v = taskVisualStatus(task, today);
                    return (
                      <span
                        key={task.id}
                        className={cn("size-1.5 rounded-full", STATUS_STYLES[v].dot)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-border/60 px-2.5 py-1.5">
        {(["scheduled", "in_progress", "completed", "delayed"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("size-2 rounded-full", STATUS_STYLES[s].dot)} />
            {tStatus(s)}
          </span>
        ))}
      </div>
    </>
  );
}

/* ── Week grid ─────────────────────────────────────────────────────────── */

function WeekGrid({
  slug,
  today,
  weekDays,
  tasksByDate,
  selectedDate,
  hoveredSlot,
  onSelectDate,
  onHoverSlot,
}: {
  slug: string;
  today: string;
  weekDays: Date[];
  tasksByDate: Record<string, AnyTask[]>;
  selectedDate: string | null;
  hoveredSlot: string | null;
  onSelectDate: (d: string | null) => void;
  onHoverSlot: (d: string | null) => void;
}) {
  const tWeekdays = useTranslations("calendar.weekdays");
  const t = useTranslations("calendar.planning");
  return (
    <div className="grid grid-cols-7 divide-x divide-border/60">
      {weekDays.map((d) => {
        const iso = toIso(d);
        const dayTasks = tasksByDate[iso] ?? [];
        const isToday = iso === today;
        const isSelected = iso === selectedDate;
        const isHovered = iso === hoveredSlot;

        return (
          <div key={iso} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelectDate(isSelected ? null : iso)}
              onMouseEnter={() => onHoverSlot(iso)}
              onMouseLeave={() => onHoverSlot(null)}
              className={cn(
                "w-full border-b border-border/60 px-1.5 py-1.5 text-left transition-colors",
                isHovered && "bg-muted/20",
                isSelected && "bg-primary/[0.04]",
              )}
            >
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                {tWeekdays(WEEKDAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1])}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[13px] font-semibold tabular-nums",
                  isToday && "text-primary",
                )}
              >
                {d.getDate()}
              </p>
            </button>
            <div className="space-y-1 p-1.5 min-h-[200px]">
              {dayTasks.map((task) => (
                <TaskCard key={task.id} slug={slug} task={task} today={today} />
              ))}
              {dayTasks.length === 0 && (
                <div
                  className={cn(
                    "rounded-md border border-dashed border-border/50 py-4 text-center text-[10px] text-muted-foreground/60 transition-colors",
                    isHovered && "border-primary/20 bg-primary/[0.02]",
                  )}
                >
                  {t("free")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Day timeline ──────────────────────────────────────────────────────── */

function DayTimeline({
  slug,
  today,
  date,
  tasks,
  hoveredSlot,
  onHoverSlot,
}: {
  slug: string;
  today: string;
  date: string;
  tasks: AnyTask[];
  hoveredSlot: string | null;
  onHoverSlot: (d: string | null) => void;
}) {
  const t = useTranslations("calendar.planning");
  const buckets = {
    morning: tasks.filter((t) => timeBucket(t.scheduled_start) === "morning"),
    afternoon: tasks.filter((t) => timeBucket(t.scheduled_start) === "afternoon"),
    evening: tasks.filter((t) => timeBucket(t.scheduled_start) === "evening"),
  };

  return (
    <div className="divide-y divide-border/60">
      {(TIME_BUCKET_KEYS as readonly ("morning" | "afternoon" | "evening")[]).map((key) => (
        <div
          key={key}
          className={cn(
            "px-3 py-2 transition-colors duration-200",
            hoveredSlot === key && "bg-muted/15",
          )}
          onMouseEnter={() => onHoverSlot(key)}
          onMouseLeave={() => onHoverSlot(null)}
        >
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] font-medium">{t(`timeBuckets.${key}`)}</p>
            <p className="text-[10px] text-muted-foreground">{t(`timeBuckets.${key}Range`)}</p>
          </div>
          {buckets[key].length === 0 ? (
            <div className="rounded-md border border-dashed border-border/50 py-3 text-center text-[10px] text-muted-foreground/60">
              {t("noTasks")}
            </div>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {buckets[key].map((task) => (
                <TaskCard key={task.id} slug={slug} task={task} today={today} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Planning sidebar ──────────────────────────────────────────────────── */

function PlanningPanel({
  slug,
  today,
  todayTasks,
  todayEmployees,
  unassignedTasks,
}: {
  slug: string;
  today: string;
  todayTasks: AnyTask[];
  todayEmployees: string[];
  unassignedTasks: AnyTask[];
}) {
  const t = useTranslations("calendar.planning");
  const locale = useLocale();
  const grouped = {
    morning: todayTasks.filter((t) => timeBucket(t.scheduled_start) === "morning"),
    afternoon: todayTasks.filter((t) => timeBucket(t.scheduled_start) === "afternoon"),
    evening: todayTasks.filter((t) => timeBucket(t.scheduled_start) === "evening"),
  };

  return (
    <div className="space-y-2">
      <OperationsWorkspace className="shadow-sm">
        <PanelHeader
          icon={CalendarDays}
          title={t("panel.today")}
          subtitle={parseIso(today).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        />
        <div className="max-h-[280px] overflow-y-auto p-2 space-y-2">
          {(TIME_BUCKET_KEYS as readonly ("morning" | "afternoon" | "evening")[]).map((key) => (
            <div key={key}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {t(`timeBuckets.${key}`)}
              </p>
              {grouped[key].length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 py-1">—</p>
              ) : (
                <div className="space-y-1">
                  {grouped[key].map((task) => (
                    <SidebarTask key={task.id} slug={slug} task={task} today={today} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </OperationsWorkspace>

      <OperationsWorkspace className="shadow-sm">
        <PanelHeader icon={Users} title={t("panel.teamAvailability")} />
        <div className="p-2">
          {todayEmployees.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 py-1">
              {t("panel.noAssignmentsToday")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {todayEmployees.map((name) => (
                <span
                  key={name}
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 text-[10px] font-medium"
                >
                  <span className="size-4 rounded bg-primary/15 text-center text-[9px] leading-4 text-primary">
                    {name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="truncate max-w-[100px]">{name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </OperationsWorkspace>

      <OperationsWorkspace className="shadow-sm">
        <PanelHeader
          icon={AlertTriangle}
          title={t("panel.unassigned")}
          subtitle={t("panel.openCount", { count: unassignedTasks.length })}
        />
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
          {unassignedTasks.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 py-1">
              {t("panel.allAssigned")}
            </p>
          ) : (
            unassignedTasks.slice(0, 8).map((task) => (
              <SidebarTask key={task.id} slug={slug} task={task} today={today} />
            ))
          )}
          {unassignedTasks.length > 8 && (
            <Link
              href={`/${slug}/tasks`}
              className="block pt-1 text-[10px] text-primary hover:underline"
            >
              {t("panel.showMore", { count: unassignedTasks.length - 8 })}
            </Link>
          )}
        </div>
      </OperationsWorkspace>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-muted-foreground" />
        <span className="text-[11px] font-medium">{title}</span>
      </div>
      {subtitle && (
        <span className="text-[10px] tabular-nums text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

function SidebarTask({
  slug,
  task,
  today,
}: {
  slug: string;
  task: AnyTask;
  today: string;
}) {
  const t = useTranslations("calendar.planning");
  const visual = taskVisualStatus(task, today);
  const style = STATUS_STYLES[visual] ?? STATUS_STYLES.scheduled;
  const addr = getAddress(task);

  return (
    <Link
      href={`/${slug}/tasks/${task.id}`}
      className={cn(
        "block rounded-md border border-border/50 border-l-2 px-2 py-1.5 transition-all duration-200",
        "hover:-translate-y-px hover:shadow-sm",
        style.border,
        style.bg,
      )}
    >
      <p className="truncate text-[11px] font-medium leading-tight">{task.title}</p>
      <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
        <span className="truncate">{addr?.city ?? "—"}</span>
        <span className="shrink-0 tabular-nums">{formatDuration(task, t("allDay"))}</span>
      </div>
    </Link>
  );
}
