import { createClient } from "@/lib/supabase/server";
import { getFinanceDashboardData, type FinanceDashboardData } from "@/lib/finance/dashboard-data";
import { minutesBetween } from "@/lib/workforce/workforce-data";
import { syncEmployeeAvailabilityStatuses } from "@/lib/workforce/sync-availability";
import { hasMinRole } from "@/types/enums";
import type { MemberRole } from "@/types";

export interface ExecutiveKpi {
  id: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  accent: "blue" | "emerald" | "amber" | "rose" | "neutral";
}

export interface TodayServiceRow {
  id: string;
  time: string;
  clientName: string;
  employeeName: string;
  status: string;
  title: string;
}

export interface WeekPlanningDay {
  label: string;
  date: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface MapPin {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: "employee" | "service";
}

export interface TaskStatusSlice {
  key: string;
  value: number;
  color: string;
}

export interface WorkforceAllocation {
  onService: number;
  available: number;
  absent: number;
  vacation: number;
}

export interface ExecutiveAlert {
  id: string;
  type: "danger" | "warning" | "info";
  messageKey: string;
  count: number;
  href: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  at: string;
  href: string;
}

export interface ForecastPoint {
  date: string;
  label: string;
  amountCents: number;
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveKpi[];
  todayServices: TodayServiceRow[];
  weekPlanning: WeekPlanningDay[];
  mapPins: MapPin[];
  taskStatus: TaskStatusSlice[];
  finance: {
    monthlyRevenueCents: number;
    projectedRevenueCents: number;
    openInvoicesCents: number;
    overdueInvoicesCents: number;
  } | null;
  workforce: WorkforceAllocation;
  alerts: ExecutiveAlert[];
  activities: ActivityItem[];
  forecast: ForecastPoint[];
  showFinance: boolean;
}

function pickName(
  rel: { name?: string | null; full_name?: string | null } | Array<{ name?: string | null; full_name?: string | null }> | null | undefined,
): string {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name ?? row?.full_name ?? "—";
}

function monthlyContractAmount(amountCents: number, frequency: string): number {
  switch (frequency) {
    case "quarterly":
      return Math.round(amountCents / 3);
    case "semiannual":
      return Math.round(amountCents / 6);
    case "annual":
      return Math.round(amountCents / 12);
    default:
      return amountCents;
  }
}

export async function loadExecutiveDashboardData(
  companyId: string,
  slug: string,
  role: MemberRole,
  dateLocale: string,
): Promise<ExecutiveDashboardData> {
  await syncEmployeeAvailabilityStatuses(companyId);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  const weekStart = new Date();
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekFrom = weekStart.toISOString().slice(0, 10);
  const weekTo = weekEnd.toISOString().slice(0, 10);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const showFinance = hasMinRole(role, "supervisor");

  const [
    { count: todayTasksCount },
    { count: yesterdayTasksCount },
    { count: completedTodayCount },
    { count: activeEmployeesCount },
    { data: todayCheckIns },
    { data: todayTasksDetail },
    { data: weekTasks },
    { data: allEmployees },
    { data: openCheckInsGeo },
    { data: taskStatusRows },
    { count: overdueTasksCount },
    { data: todayWithAssignments },
    { data: expiringContracts },
    { data: recentEvents },
    { data: recentInvoicesCreated },
    { data: recentClients },
    { data: recentContracts },
    { data: activeContracts },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("scheduled_date", today).neq("status", "cancelled"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("scheduled_date", yesterdayIso).neq("status", "cancelled"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("scheduled_date", today).eq("status", "completed"),
    supabase.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
    supabase.from("check_ins").select("check_in_at, check_out_at").eq("company_id", companyId).gte("check_in_at", `${today}T00:00:00`).lte("check_in_at", `${today}T23:59:59`).not("check_out_at", "is", null),
    supabase
      .from("tasks")
      .select(`
        id, title, status, scheduled_start,
        address:addresses(label, street, city, latitude, longitude, client:clients(name)),
        assignments:task_assignments(employee:employees(full_name))
      `)
      .eq("company_id", companyId)
      .eq("scheduled_date", today)
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase.from("tasks").select("scheduled_date, status").eq("company_id", companyId).gte("scheduled_date", weekFrom).lte("scheduled_date", weekTo).neq("status", "cancelled"),
    supabase.from("employees").select("id, status").eq("company_id", companyId).neq("status", "terminated"),
    supabase
      .from("check_ins")
      .select(`
        id, check_in_latitude, check_in_longitude,
        employee:employees(full_name),
        task:tasks(title, address:addresses(label, latitude, longitude))
      `)
      .eq("company_id", companyId)
      .is("check_out_at", null),
    supabase.from("tasks").select("status, scheduled_date").eq("company_id", companyId).gte("scheduled_date", monthStart).lte("scheduled_date", today).neq("status", "cancelled"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("company_id", companyId).lt("scheduled_date", today).in("status", ["draft", "scheduled", "in_progress"]),
    supabase
      .from("tasks")
      .select("id, assignments:task_assignments(id)")
      .eq("company_id", companyId)
      .eq("scheduled_date", today)
      .in("status", ["scheduled", "draft"]),
    supabase
      .from("contracts")
      .select("id, title, end_date")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .not("end_date", "is", null)
      .lte("end_date", new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
      .gte("end_date", today),
    supabase.from("task_events").select("id, event_type, created_at, task:tasks(id, title)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(8),
    supabase.from("invoices").select("id, invoice_number, client_name, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5),
    supabase.from("clients").select("id, name, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5),
    supabase.from("contracts").select("id, title, created_at, client:clients(name)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5),
    supabase.from("contracts").select("amount_cents, frequency, next_invoice_date").eq("company_id", companyId).eq("is_active", true),
  ]);

  const todayTotal = todayTasksCount ?? 0;
  const yesterdayTotal = yesterdayTasksCount ?? 1;
  const todayTrendPct = yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100) : 0;
  const completedToday = completedTodayCount ?? 0;
  const completionTodayPct = todayTotal > 0 ? Math.round((completedToday / todayTotal) * 100) : 0;

  const hoursWorkedMinutes = (todayCheckIns ?? []).reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return acc + minutesBetween(ci.check_in_at as string, ci.check_out_at as string);
  }, 0);
  const hoursWorked = Math.round(hoursWorkedMinutes / 60);

  let financeData: FinanceDashboardData | null = null;
  if (showFinance) {
    try {
      financeData = await getFinanceDashboardData(slug);
    } catch {
      financeData = null;
    }
  }

  const kpis: ExecutiveKpi[] = [
    {
      id: "todayServices",
      value: String(todayTotal),
      trend: `${todayTrendPct >= 0 ? "+" : ""}${todayTrendPct}%`,
      trendPositive: todayTrendPct >= 0,
      accent: "blue",
    },
    {
      id: "completedToday",
      value: String(completedToday),
      trend: `${completionTodayPct}%`,
      trendPositive: completionTodayPct >= 50,
      accent: "emerald",
    },
    {
      id: "activeEmployees",
      value: String(activeEmployeesCount ?? 0),
      accent: "neutral",
    },
    {
      id: "hoursWorked",
      value: `${hoursWorked}h`,
      accent: "amber",
    },
    {
      id: "monthlyRevenue",
      value: financeData
        ? new Intl.NumberFormat(dateLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(financeData.kpis.monthlyRevenueCents / 100)
        : "—",
      trend: financeData && financeData.kpis.monthlyRevenueChangePct !== 0
        ? `${financeData.kpis.monthlyRevenueChangePct >= 0 ? "+" : ""}${financeData.kpis.monthlyRevenueChangePct}%`
        : undefined,
      trendPositive: (financeData?.kpis.monthlyRevenueChangePct ?? 0) >= 0,
      accent: "emerald",
    },
    {
      id: "openInvoices",
      value: financeData
        ? new Intl.NumberFormat(dateLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(financeData.kpis.pendingInvoicesCents / 100)
        : "—",
      accent: "rose",
    },
  ];

  const todayServices: TodayServiceRow[] = (todayTasksDetail ?? []).map((task) => {
    const addr = Array.isArray(task.address) ? task.address[0] : task.address;
    const client = addr?.client ? (Array.isArray(addr.client) ? addr.client[0] : addr.client) : null;
    const assignments = task.assignments as Array<{ employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null }> | null;
    const firstAssign = assignments?.[0];
    const emp = firstAssign?.employee;
    const employeeName = pickName(emp as { full_name?: string | null } | Array<{ full_name?: string | null }> | null);
    const time = task.scheduled_start ? String(task.scheduled_start).slice(0, 5) : "—";
    return {
      id: task.id as string,
      time,
      clientName: (client as { name?: string })?.name ?? addr?.label ?? addr?.street ?? "—",
      employeeName,
      status: task.status as string,
      title: task.title as string,
    };
  });

  const weekPlanning: WeekPlanningDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayTasks = (weekTasks ?? []).filter((t) => t.scheduled_date === iso);
    return {
      label: d.toLocaleDateString(dateLocale, { weekday: "short" }),
      date: iso,
      scheduled: dayTasks.filter((t) => t.status === "scheduled" || t.status === "draft").length,
      inProgress: dayTasks.filter((t) => t.status === "in_progress").length,
      completed: dayTasks.filter((t) => t.status === "completed").length,
      overdue: iso < today ? dayTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length : 0,
    };
  });

  const mapPins: MapPin[] = [];
  for (const ci of openCheckInsGeo ?? []) {
    if (ci.check_in_latitude != null && ci.check_in_longitude != null) {
      mapPins.push({
        id: `ci-${ci.id}`,
        label: `${pickName(ci.employee as { full_name?: string | null } | Array<{ full_name?: string | null }> | null)} · ${(Array.isArray(ci.task) ? ci.task[0] : ci.task)?.title ?? "Serviço"}`,
        lat: ci.check_in_latitude as number,
        lng: ci.check_in_longitude as number,
        type: "employee",
      });
    }
    const task = Array.isArray(ci.task) ? ci.task[0] : ci.task;
    const addr = task?.address ? (Array.isArray(task.address) ? task.address[0] : task.address) : null;
    if (addr?.latitude != null && addr?.longitude != null) {
      mapPins.push({
        id: `addr-${ci.id}`,
        label: addr.label ?? task?.title ?? "Local",
        lat: addr.latitude as number,
        lng: addr.longitude as number,
        type: "service",
      });
    }
  }

  const statusCounts = {
    completed: 0,
    in_progress: 0,
    scheduled: 0,
    overdue: overdueTasksCount ?? 0,
  };
  for (const t of taskStatusRows ?? []) {
    if (t.status === "completed") statusCounts.completed++;
    else if (t.status === "in_progress") statusCounts.in_progress++;
    else if (t.status === "scheduled" || t.status === "draft") statusCounts.scheduled++;
  }

  const taskStatus: TaskStatusSlice[] = [
    { key: "completed", value: statusCounts.completed, color: "#10B981" },
    { key: "in_progress", value: statusCounts.in_progress, color: "#2563EB" },
    { key: "scheduled", value: statusCounts.scheduled, color: "#6B7280" },
    { key: "overdue", value: statusCounts.overdue, color: "#EF4444" },
  ].filter((s) => s.value > 0);

  const employees = allEmployees ?? [];
  const onService = openCheckInsGeo?.length ?? 0;
  const vacation = employees.filter((e) => e.status === "on_vacation").length;
  const absent = employees.filter((e) => e.status === "absent").length;
  const available = Math.max(0, employees.filter((e) => e.status === "active").length - onService);

  const workforce: WorkforceAllocation = { onService, available, absent, vacation };

  const alerts: ExecutiveAlert[] = [];
  if ((overdueTasksCount ?? 0) > 0) {
    alerts.push({ id: "overdue", type: "danger", messageKey: "overdueServices", count: overdueTasksCount ?? 0, href: `/${slug}/tasks` });
  }
  if (absent > 0) {
    alerts.push({ id: "absent", type: "warning", messageKey: "absentEmployees", count: absent, href: `/${slug}/workforce/absences` });
  }
  const unassignedCount = (todayWithAssignments ?? []).filter(
    (t) => !(t.assignments as unknown[] | null)?.length,
  ).length;
  if (unassignedCount > 0) {
    alerts.push({ id: "unassigned", type: "warning", messageKey: "unassignedJobs", count: unassignedCount, href: `/${slug}/tasks` });
  }
  if (financeData && financeData.kpis.overdueInvoicesCount > 0) {
    alerts.push({ id: "invoices", type: "danger", messageKey: "overdueInvoices", count: financeData.kpis.overdueInvoicesCount, href: `/${slug}/finance/invoices` });
  }
  if ((expiringContracts?.length ?? 0) > 0) {
    alerts.push({ id: "contracts", type: "info", messageKey: "expiringContracts", count: expiringContracts?.length ?? 0, href: `/${slug}/finance/contracts` });
  }

  const activities: ActivityItem[] = [];

  for (const ev of recentEvents ?? []) {
    const task = Array.isArray(ev.task) ? ev.task[0] : ev.task;
    activities.push({
      id: `ev-${ev.id}`,
      type: "task",
      title: task?.title ?? "Serviço",
      subtitle: ev.event_type as string,
      at: ev.created_at as string,
      href: task?.id ? `/${slug}/tasks/${task.id}` : `/${slug}/tasks`,
    });
  }
  for (const inv of recentInvoicesCreated ?? []) {
    activities.push({
      id: `inv-${inv.id}`,
      type: "invoice",
      title: inv.invoice_number as string,
      subtitle: inv.client_name as string,
      at: inv.created_at as string,
      href: `/${slug}/finance/invoices`,
    });
  }
  for (const cl of recentClients ?? []) {
    activities.push({
      id: `cl-${cl.id}`,
      type: "client",
      title: cl.name as string,
      subtitle: "client",
      at: cl.created_at as string,
      href: `/${slug}/clients/${cl.id}`,
    });
  }
  for (const ct of recentContracts ?? []) {
    activities.push({
      id: `ct-${ct.id}`,
      type: "contract",
      title: ct.title as string,
      subtitle: pickName(ct.client as { name?: string | null } | Array<{ name?: string | null }> | null),
      at: ct.created_at as string,
      href: `/${slug}/finance/contracts/${ct.id}`,
    });
  }

  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const forecast: ForecastPoint[] = [];
  const dailyRecurring = (activeContracts ?? []).reduce(
    (sum, c) => sum + Math.round(monthlyContractAmount(c.amount_cents as number, c.frequency as string) / 30),
    0,
  );
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    forecast.push({
      date: iso,
      label: d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }),
      amountCents: dailyRecurring * (i + 1),
    });
  }

  return {
    kpis,
    todayServices,
    weekPlanning,
    mapPins,
    taskStatus,
    finance: financeData
      ? {
          monthlyRevenueCents: financeData.kpis.monthlyRevenueCents,
          projectedRevenueCents: financeData.kpis.projectedRevenueCents,
          openInvoicesCents: financeData.kpis.pendingInvoicesCents,
          overdueInvoicesCents: financeData.kpis.overdueInvoicesCents,
        }
      : null,
    workforce,
    alerts,
    activities: activities.slice(0, 12),
    forecast,
    showFinance,
  };
}
