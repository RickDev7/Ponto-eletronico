import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import {
  ActivityView,
  type ActivityAlert,
  type ActivityFeedItem,
  type FeedCategory,
} from "@/components/features/activity/activity-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activity");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 50;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function categorizeLog(entityType: string, action: string): FeedCategory {
  if (action === "check_in" || action === "check_out") return "audits";
  if (action === "report_generated" || entityType === "report") return "financial";
  if (entityType === "employee") return "employees";
  if (entityType === "client") return "clients";
  if (entityType === "address") return "properties";
  if (entityType === "task" || action === "assigned") return "tasks";
  return "tasks";
}

function entityHref(
  slug: string,
  entityType: string,
  entityId: string,
): string | null {
  switch (entityType) {
    case "task":
      return `/${slug}/tasks/${entityId}`;
    case "client":
      return `/${slug}/clients`;
    case "employee":
      return `/${slug}/employees`;
    case "address":
      return `/${slug}/addresses`;
    case "report":
      return `/${slug}/reports`;
    default:
      return entityType === "task" ? `/${slug}/tasks/${entityId}` : null;
  }
}

function entityLabel(
  entityType: string,
  entityId: string,
  taskTitles: Map<string, string>,
  metadata: Record<string, unknown> | null,
  entities: {
    task: string;
    client: string;
    employee: string;
    address: string;
    company: string;
    report: string;
    fallback: string;
  },
): string {
  if (entityType === "task") {
    return taskTitles.get(entityId) ?? (metadata?.title as string) ?? entities.task;
  }
  if (metadata?.name) return String(metadata.name);
  if (metadata?.title) return String(metadata.title);
  if (entityType === "client") return entities.client;
  if (entityType === "employee") return entities.employee;
  if (entityType === "address") return entities.address;
  if (entityType === "company") return entities.company;
  if (entityType === "report") return entities.report;
  return entities.fallback;
}

export default async function ActivityPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const [t, locale] = await Promise.all([getTranslations("activity"), getLocale()]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const companyId = ctx.company.id;

  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (currentPage - 1) * PAGE_SIZE;
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadIso = weekAhead.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  const supabase = await createClient();

  const [
    { data: logs, count },
    { data: overdueTasks },
    { data: auditCheckIns },
    { data: upcomingTasks },
    { count: activeEmployees },
    { count: activeTasks },
    { count: openCheckIns },
    { data: monthlyTasks },
  ] = await Promise.all([
    supabase
      .from("activity_logs")
      .select(
        `
        id, action, metadata, created_at, entity_type, entity_id, user_id,
        profile:profiles(full_name)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("tasks")
      .select("id, title, scheduled_date")
      .eq("company_id", companyId)
      .lt("scheduled_date", today)
      .in("status", ["draft", "scheduled", "in_progress"])
      .order("scheduled_date", { ascending: true })
      .limit(5),
    supabase
      .from("check_ins")
      .select(`
        id, check_in_at, check_in_latitude, check_in_longitude,
        employee:employees(full_name),
        task:tasks(
          id, title,
          address:addresses(latitude, longitude)
        )
      `)
      .eq("company_id", companyId)
      .gte("check_in_at", sevenDaysAgoIso)
      .order("check_in_at", { ascending: false })
      .limit(80),
    supabase
      .from("tasks")
      .select(`
        id, title, scheduled_date,
        assignments:task_assignments(employee_id, employee:employees(full_name))
      `)
      .eq("company_id", companyId)
      .gte("scheduled_date", today)
      .lte("scheduled_date", weekAheadIso)
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("check_out_at", null),
    supabase
      .from("tasks")
      .select("status")
      .eq("company_id", companyId)
      .gte("scheduled_date", monthStartIso)
      .lte("scheduled_date", today)
      .neq("status", "cancelled"),
  ]);

  const taskIds = (logs ?? [])
    .filter((l) => l.entity_type === "task")
    .map((l) => l.entity_id);

  const { data: taskRows } =
    taskIds.length > 0
      ? await supabase.from("tasks").select("id, title").in("id", taskIds)
      : { data: [] as { id: string; title: string }[] };

  const taskTitles = new Map((taskRows ?? []).map((t) => [t.id, t.title]));

  const entityLabels = {
    task: t("entities.task"),
    client: t("entities.client"),
    employee: t("entities.employee"),
    address: t("entities.address"),
    company: t("entities.company"),
    report: t("entities.report"),
    fallback: t("entityFallback"),
  };

  const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale);

  const feedItems: ActivityFeedItem[] = (logs ?? []).map((log) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray(log.profile) ? log.profile[0] : (log.profile as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (log.metadata ?? null) as Record<string, any> | null;
    const actorName =
      profile?.full_name ?? (meta?.author as string) ?? (meta?.actor as string) ?? "System";

    return {
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityLabel: entityLabel(log.entity_type, log.entity_id, taskTitles, meta, entityLabels),
      entityHref: entityHref(companySlug, log.entity_type, log.entity_id),
      actorName,
      createdAt: log.created_at,
      metadata: meta,
      category: categorizeLog(log.entity_type, log.action),
    };
  });

  const overdueAlerts: ActivityAlert[] = (overdueTasks ?? []).map((task) => ({
    id: task.id,
    label: task.title,
    href: `/${companySlug}/tasks/${task.id}`,
    meta: t("alertMeta.due", { date: formatDate(task.scheduled_date) }),
  }));

  const failedAuditAlerts: ActivityAlert[] = (auditCheckIns ?? [])
    .flatMap((ci) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const task = Array.isArray(ci.task) ? (ci.task[0] as any) : (ci.task as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const address = Array.isArray(task?.address)
        ? (task.address[0] as any)
        : (task?.address as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const employee = Array.isArray(ci.employee)
        ? (ci.employee[0] as any)
        : (ci.employee as any);

      const hasGps = ci.check_in_latitude != null && ci.check_in_longitude != null;
      if (!hasGps) return [];

      if (
        address?.latitude == null ||
        address?.longitude == null
      ) {
        return [];
      }

      const distance = haversineMeters(
        ci.check_in_latitude!,
        ci.check_in_longitude!,
        address.latitude,
        address.longitude,
      );

      if (distance <= 1000) return [];

      return [
        {
          id: ci.id,
          label: task?.title ?? t("entities.checkIn"),
          href: task?.id ? `/${companySlug}/tasks/${task.id}` : `/${companySlug}/audits`,
          meta: t("alertMeta.outsideRadius", {
            name: employee?.full_name ?? "—",
            distance: Math.round(distance),
          }),
        },
      ];
    })
    .slice(0, 5);

  const conflictMap = new Map<
    string,
    { employeeId: string; employeeName: string; date: string; tasks: string[] }
  >();
  (upcomingTasks ?? []).forEach((task) => {
    const assignments = Array.isArray(task.assignments) ? task.assignments : [];
    assignments.forEach((assignment) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = assignment as any;
      const employee = Array.isArray(a.employee) ? a.employee[0] : a.employee;
      if (!a.employee_id || !task.scheduled_date) return;
      const key = `${a.employee_id}-${task.scheduled_date}`;
      const existing = conflictMap.get(key);
      if (existing) {
        existing.tasks.push(task.title);
      } else {
        conflictMap.set(key, {
          employeeId: a.employee_id,
          employeeName: employee?.full_name ?? t("entities.employee"),
          date: task.scheduled_date,
          tasks: [task.title],
        });
      }
    });
  });

  const schedulingAlerts: ActivityAlert[] = [...conflictMap.values()]
    .filter((c) => c.tasks.length > 1)
    .slice(0, 5)
    .map((c, i) => ({
      id: `conflict-${i}`,
      label: c.employeeName,
      href: `/${companySlug}/calendar`,
      meta: t("alertMeta.assignmentsOnDate", {
        count: c.tasks.length,
        date: formatDate(c.date),
      }),
    }));

  const totalMonthly = monthlyTasks?.length ?? 0;
  const completedMonthly =
    monthlyTasks?.filter((t) => t.status === "completed").length ?? 0;
  const completionRate =
    totalMonthly > 0 ? Math.round((completedMonthly / totalMonthly) * 100) : 0;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <AppShellPage size="fluid">
      <ActivityView
        slug={companySlug}
        items={feedItems}
        totalCount={count ?? 0}
        currentPage={currentPage}
        totalPages={totalPages}
        alerts={{
          overdue: overdueAlerts,
          failedAudits: failedAuditAlerts,
          schedulingConflicts: schedulingAlerts,
        }}
        health={{
          activeTasks: activeTasks ?? 0,
          openCheckIns: openCheckIns ?? 0,
          completionRate,
          activeEmployees: activeEmployees ?? 0,
        }}
      />
    </AppShellPage>
  );
}
