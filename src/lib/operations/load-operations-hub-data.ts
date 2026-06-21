import "server-only";

import { createClient } from "@/lib/supabase/server";
import { computeOperationsKpis } from "@/lib/operations/operations-data";
import { workflowStageCounts } from "@/lib/operations/operations-workflow";
import type { OperationsHubData, TaskEventRow, TraceableExecution } from "@/lib/operations/traceable-execution-types";
import {
  mapTraceableRows,
  TRACEABLE_TASK_SELECT,
} from "@/lib/operations/traceable-execution-types";

export async function loadTraceableExecutions(
  companyId: string,
  from?: string,
  to?: string,
  limit = 500,
): Promise<TraceableExecution[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(TRACEABLE_TASK_SELECT)
    .eq("company_id", companyId)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: false });

  if (from) query = query.gte("scheduled_date", from);
  if (to) query = query.lte("scheduled_date", to);

  const { data } = await query.limit(limit);
  return mapTraceableRows((data ?? []) as Record<string, unknown>[]);
}

export async function loadRecentTaskEvents(
  companyId: string,
  limit = 20,
): Promise<TaskEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_events")
    .select(
      "id, event_type, message, metadata, created_at, task_id, creator:profiles(full_name), task:tasks(title)",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((ev) => {
    const creator = ev.creator as { full_name: string | null } | { full_name: string | null }[] | null;
    const task = ev.task as { title: string } | { title: string }[] | null;
    const creatorRow = Array.isArray(creator) ? creator[0] : creator;
    const taskRow = Array.isArray(task) ? task[0] : task;
    return {
      id: ev.id,
      event_type: ev.event_type,
      message: ev.message,
      metadata: (ev.metadata as Record<string, unknown>) ?? {},
      created_at: ev.created_at,
      task_id: ev.task_id,
      taskTitle: taskRow?.title ?? null,
      creatorName: creatorRow?.full_name ?? null,
    };
  });
}

export async function loadTaskEventsForTask(
  companyId: string,
  taskId: string,
): Promise<TaskEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_events")
    .select("id, event_type, message, metadata, created_at, task_id, creator:profiles(full_name)")
    .eq("company_id", companyId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((ev) => {
    const creator = ev.creator as { full_name: string | null } | { full_name: string | null }[] | null;
    const creatorRow = Array.isArray(creator) ? creator[0] : creator;
    return {
      id: ev.id,
      event_type: ev.event_type,
      message: ev.message,
      metadata: (ev.metadata as Record<string, unknown>) ?? {},
      created_at: ev.created_at,
      task_id: ev.task_id,
      creatorName: creatorRow?.full_name ?? null,
    };
  });
}

export async function loadOperationsHubData(companyId: string): Promise<OperationsHubData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [executions, recentHistory, contractsCount, propertiesCount, servicesCount] =
    await Promise.all([
      loadTraceableExecutions(companyId, monthStartStr),
      loadRecentTaskEvents(companyId, 15),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true)
        .not("address_id", "is", null),
      supabase
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true),
    ]);

  const baseKpis = computeOperationsKpis(executions, [], []);
  const weekExecutions = executions.filter((e) => e.scheduled_date >= weekStartStr);
  const completedWeek = weekExecutions.filter(
    (e) => e.status === "completed" || e.approved_at,
  ).length;
  const overdueCount = executions.filter(
    (e) => e.scheduled_date < today && e.status !== "completed" && !e.approved_at,
  ).length;
  const traceable = executions.filter(
    (e) => e.contract_id && e.propertyId && (e.service_id || e.serviceName),
  ).length;
  const traceablePercent =
    executions.length === 0 ? 100 : Math.round((traceable / executions.length) * 100);

  return {
    executions,
    kpis: {
      todayCount: baseKpis.todayCount,
      weekCount: weekExecutions.length,
      completedWeek,
      overdueCount,
      traceablePercent,
      upcomingVisits: executions.filter(
        (e) => e.scheduled_date >= today && e.status !== "completed" && !e.approved_at,
      ).length,
    },
    workflowCounts: workflowStageCounts(executions),
    recentHistory,
    activeContracts: contractsCount.count ?? 0,
    activeProperties: propertiesCount.count ?? 0,
    activeServices: servicesCount.count ?? 0,
  };
}
