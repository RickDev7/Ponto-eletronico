"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import { minutesBetween } from "@/lib/workforce/workforce-data";
import { loadWorktimePolicy } from "@/lib/workforce/load-workforce-data";
import {
  computeNetWorkedMinutes,
  computeOvertimeMinutes,
  dailyContractMinutes,
  policyOvertimeThresholdMinutes,
  resolveBreakMinutes,
  resolveTravelMinutes,
} from "@/lib/time-tracking/compute-time-summary";
import { syncEmployeeAvailabilityStatuses } from "@/lib/workforce/sync-availability";
import {
  copyDateRangePlanning,
  copyMonthPlanning,
  clonePlanningAssignment,
  parseTask,
  ASSIGNMENT_SELECT,
} from "@/lib/workforce/duplicate-planning";
import { checkPlanningAutomations } from "@/lib/workforce/planning-automations";
import {
  createAbsenceSchema,
  createEmployeeDocumentSchema,
  createVacationRequestSchema,
  createCompanySkillSchema,
  assignEmployeeSkillSchema,
  updateEmployeeWorkforceSchema,
  worktimePolicySchema,
  type CreateAbsenceInput,
  type CreateEmployeeDocumentInput,
  type CreateVacationRequestInput,
  type CreateCompanySkillInput,
  type AssignEmployeeSkillInput,
  type UpdateEmployeeWorkforceInput,
  type WorktimePolicyInput,
} from "@/lib/validations/workforce";
import type { ActionResult } from "@/actions/auth/actions";

function workforcePaths(slug: string) {
  return [
    `/${slug}/workforce`,
    `/${slug}/workforce/employees`,
    `/${slug}/workforce/shifts`,
    `/${slug}/workforce/planning`,
    `/${slug}/workforce/planning/reports`,
    `/${slug}/workforce/vehicles`,
    `/${slug}/workforce/vacations`,
    `/${slug}/workforce/absences`,
    `/${slug}/workforce/time-account`,
    `/${slug}/workforce/timesheets`,
    `/${slug}/workforce/time-tracking`,
    `/${slug}/workforce/worktime`,
    `/${slug}/workforce/documents`,
    `/${slug}/workforce/teams`,
    `/${slug}/workforce/skills`,
    `/${slug}/workforce/availability`,
    `/${slug}/employees`,
    `/${slug}/operations/scheduling`,
    `/${slug}/schedule`,
  ];
}

function revalidateWorkforce(slug: string, employeeId?: string) {
  for (const path of workforcePaths(slug)) {
    revalidatePath(path);
  }
  if (employeeId) {
    revalidatePath(`/${slug}/workforce/employees/${employeeId}`);
  }
  revalidatePath(`/${slug}/workforce`, "layout");
}

export async function syncWorkforceAvailabilityAction(slug: string): Promise<void> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  await syncEmployeeAvailabilityStatuses(ctx.company.id);
  revalidateWorkforce(slug);
}

export async function recordTimeAccountFromCheckIn(
  companyId: string,
  checkInId: string,
  employeeId: string,
  checkInAt: string,
  checkOutAt: string,
) {
  const supabase = await createClient();
  const entryDate = checkInAt.slice(0, 10);

  const [{ data: employee }, { data: checkIn }, policy] = await Promise.all([
    supabase.from("employees").select("weekly_hours").eq("id", employeeId).single(),
    supabase
      .from("check_ins")
      .select(`
        break_minutes_actual, travel_minutes_actual,
        task:tasks(break_minutes, travel_minutes, scheduled_date)
      `)
      .eq("id", checkInId)
      .single(),
    loadWorktimePolicy(companyId),
  ]);

  const task = Array.isArray(checkIn?.task) ? checkIn.task[0] : checkIn?.task;
  const weeklyHours = Number(employee?.weekly_hours ?? 40);
  const workedMinutes = minutesBetween(checkInAt, checkOutAt);
  const breakMinutes = resolveBreakMinutes(
    workedMinutes,
    Number(checkIn?.break_minutes_actual ?? 0),
    Number(task?.break_minutes ?? 0),
    policy,
  );
  const travelMinutes = resolveTravelMinutes(
    Number(checkIn?.travel_minutes_actual ?? 0),
    Number(task?.travel_minutes ?? 0),
  );
  const netWorkedMinutes = computeNetWorkedMinutes(workedMinutes, breakMinutes);
  const contractDaily = dailyContractMinutes(weeklyHours);
  const plannedMinutes = contractDaily;
  const overtimeMinutes = computeOvertimeMinutes(
    netWorkedMinutes,
    plannedMinutes,
    contractDaily,
    policyOvertimeThresholdMinutes(policy),
  );
  const balanceDelta = netWorkedMinutes - plannedMinutes;

  await supabase.from("time_account_entries").delete().eq("source_id", checkInId).eq("source", "check_in");

  await supabase.from("time_account_entries").insert({
    company_id: companyId,
    employee_id: employeeId,
    entry_date: entryDate,
    soll_minutes: plannedMinutes,
    ist_minutes: workedMinutes,
    balance_delta_minutes: balanceDelta,
    planned_minutes: plannedMinutes,
    break_minutes: breakMinutes,
    travel_minutes: travelMinutes,
    overtime_minutes: overtimeMinutes,
    net_worked_minutes: netWorkedMinutes,
    source: "check_in",
    source_id: checkInId,
  });
}

export async function updateEmployeeWorkforceAction(
  slug: string,
  employeeId: string,
  input: UpdateEmployeeWorkforceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = updateEmployeeWorkforceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employee_number: parsed.data.employeeNumber || null,
      hire_date: parsed.data.hireDate || null,
      notes: parsed.data.notes || null,
      job_title: parsed.data.jobTitle || null,
      supervisor_id: parsed.data.supervisorId ?? null,
      contract_type: parsed.data.contractType,
      weekly_hours: parsed.data.weeklyHours,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", employeeId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug, employeeId);
  return { success: true, data: undefined };
}

export async function createVacationRequestAction(
  slug: string,
  input: CreateVacationRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createVacationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vacation_requests")
    .insert({
      company_id: ctx.company.id,
      employee_id: parsed.data.employeeId,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug);
  return { success: true, data: { id: data.id } };
}

async function removeAssignmentsInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
) {
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("id, task:tasks(scheduled_date)")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId);

  const ids =
    assignments
      ?.filter((a) => {
        const task = Array.isArray(a.task) ? a.task[0] : a.task;
        const d = task?.scheduled_date as string | undefined;
        return d && d >= startDate && d <= endDate;
      })
      .map((a) => a.id) ?? [];

  if (ids.length) {
    await supabase.from("task_assignments").delete().in("id", ids);
  }
}

export async function updateVacationStatusAction(
  slug: string,
  requestId: string,
  status: "approved" | "rejected" | "cancelled",
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("vacation_requests")
    .select("*")
    .eq("id", requestId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!request) return { success: false, error: "Pedido não encontrado" };

  const { error } = await supabase
    .from("vacation_requests")
    .update({
      status,
      approved_by: status === "approved" ? ctx.profile.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  if (error) return { success: false, error: error.message };

  if (status === "approved") {
    const today = new Date().toISOString().slice(0, 10);
    if (request.start_date <= today && request.end_date >= today) {
      await supabase
        .from("employees")
        .update({ status: "on_vacation" })
        .eq("id", request.employee_id)
        .eq("company_id", ctx.company.id);
    }
    await removeAssignmentsInRange(
      supabase,
      ctx.company.id,
      request.employee_id,
      request.start_date,
      request.end_date,
    );
  }

  revalidateWorkforce(slug);
  return { success: true, data: undefined };
}

export async function createAbsenceAction(
  slug: string,
  input: CreateAbsenceInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createAbsenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_absences")
    .insert({
      company_id: ctx.company.id,
      employee_id: parsed.data.employeeId,
      absence_type: parsed.data.absenceType,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      notes: parsed.data.notes ?? null,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.startDate <= today && parsed.data.endDate >= today) {
    await supabase
      .from("employees")
      .update({ status: "absent" })
      .eq("id", parsed.data.employeeId)
      .eq("company_id", ctx.company.id);
  }

  revalidateWorkforce(slug);
  return { success: true, data: { id: data.id } };
}

export async function upsertWorktimePolicyAction(
  slug: string,
  input: WorktimePolicyInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = worktimePolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("worktime_policies").upsert(
    {
      company_id: ctx.company.id,
      work_start: parsed.data.workStart,
      work_end: parsed.data.workEnd,
      break_minutes: parsed.data.breakMinutes,
      max_daily_hours: parsed.data.maxDailyHours,
      max_weekly_hours: parsed.data.maxWeeklyHours,
      overtime_threshold_hours: parsed.data.overtimeThresholdHours,
    },
    { onConflict: "company_id" },
  );

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug);
  return { success: true, data: undefined };
}

export async function createEmployeeDocumentAction(
  slug: string,
  input: CreateEmployeeDocumentInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEmployeeDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_documents")
    .insert({
      company_id: ctx.company.id,
      employee_id: parsed.data.employeeId,
      doc_type: parsed.data.docType,
      title: parsed.data.title,
      file_name: parsed.data.fileName ?? null,
      expires_at: parsed.data.expiresAt ?? null,
      uploaded_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug);
  return { success: true, data: { id: data.id } };
}

export async function uploadEmployeeDocumentAction(
  slug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });

  const file = formData.get("file") as File | null;
  const employeeId = formData.get("employeeId") as string | null;
  const docType = formData.get("docType") as string | null;
  const title = formData.get("title") as string | null;
  const expiresAt = (formData.get("expiresAt") as string | null) || undefined;

  const parsed = createEmployeeDocumentSchema.safeParse({
    employeeId,
    docType,
    title,
    fileName: file?.name,
    expiresAt: expiresAt || null,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  if (!file || file.size === 0) {
    return { success: false, error: "Ficheiro obrigatório" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${ctx.company.id}/employees/${parsed.data.employeeId}/${fileName}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.employeeDocuments)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data, error: dbError } = await supabase
    .from("employee_documents")
    .insert({
      company_id: ctx.company.id,
      employee_id: parsed.data.employeeId,
      doc_type: parsed.data.docType,
      title: parsed.data.title,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      expires_at: parsed.data.expiresAt ?? null,
      uploaded_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKETS.employeeDocuments).remove([storagePath]);
    return { success: false, error: dbError.message };
  }

  revalidateWorkforce(slug, parsed.data.employeeId);
  return { success: true, data: { id: data.id } };
}

export async function deleteEmployeeDocumentAction(
  slug: string,
  documentId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("employee_documents")
    .select("storage_path, employee_id")
    .eq("id", documentId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!doc) return { success: false, error: "Documento não encontrado" };

  if (doc.storage_path) {
    await supabase.storage.from(STORAGE_BUCKETS.employeeDocuments).remove([doc.storage_path]);
  }

  const { error } = await supabase.from("employee_documents").delete().eq("id", documentId);
  if (error) return { success: false, error: error.message };

  revalidateWorkforce(slug, doc.employee_id as string);
  return { success: true, data: undefined };
}

export async function moveShiftAction(
  slug: string,
  assignmentId: string,
  input: { employeeId: string; scheduledDate: string },
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("task_assignments")
    .select("id, employee_id, task_id, task:tasks(scheduled_date)")
    .eq("id", assignmentId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!assignment) return { success: false, error: "Escala não encontrada" };

  const taskId = assignment.task_id as string;
  const task = Array.isArray(assignment.task) ? assignment.task[0] : assignment.task;
  const currentDate = task?.scheduled_date as string | undefined;

  if (input.scheduledDate !== currentDate) {
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ scheduled_date: input.scheduledDate, status: "scheduled" })
      .eq("id", taskId)
      .eq("company_id", ctx.company.id);
    if (taskError) return { success: false, error: taskError.message };
  }

  if (input.employeeId !== assignment.employee_id) {
    const { error: assignError } = await supabase
      .from("task_assignments")
      .update({ employee_id: input.employeeId })
      .eq("id", assignmentId)
      .eq("company_id", ctx.company.id);
    if (assignError) return { success: false, error: assignError.message };
  }

  revalidateWorkforce(slug);
  revalidatePath(`/${slug}/operations/scheduling`);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: undefined };
}

export async function duplicateShiftAction(
  slug: string,
  assignmentId: string,
  targetDate?: string,
): Promise<ActionResult<{ taskId: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("task_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("id", assignmentId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!row) return { success: false, error: "Escala não encontrada" };

  const task = parseTask(row);
  if (!task) return { success: false, error: "Tarefa inválida" };

  let newDateStr = targetDate;
  if (!newDateStr) {
    const next = new Date(task.scheduled_date + "T12:00:00");
    next.setDate(next.getDate() + 1);
    newDateStr = next.toISOString().slice(0, 10);
  }

  const cloned = await clonePlanningAssignment(supabase, {
    companyId: ctx.company.id,
    createdBy: ctx.profile.id,
    employeeId: row.employee_id as string,
    task,
    newDateStr,
  });

  if (!cloned) return { success: false, error: "Turno já existe nesta data" };

  revalidateWorkforce(slug);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: { taskId: "" } };
}

export async function copyWeekPlanningAction(
  slug: string,
  sourceWeekStart: string,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const start = new Date(sourceWeekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const targetStart = new Date(start);
  targetStart.setDate(targetStart.getDate() + 7);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetStart.getDate() + 6);

  const count = await copyDateRangePlanning(supabase, {
    companyId: ctx.company.id,
    createdBy: ctx.profile.id,
    from,
    to,
    dayOffset: 7,
    targetEnd: targetEnd.toISOString().slice(0, 10),
  });

  revalidateWorkforce(slug);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: { count } };
}

export async function copyMonthPlanningAction(
  slug: string,
  targetMonthStart: string,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const count = await copyMonthPlanning(supabase, {
    companyId: ctx.company.id,
    createdBy: ctx.profile.id,
    targetMonthStart,
  });

  revalidateWorkforce(slug);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: { count } };
}

export async function repeatSchedulePlanningAction(
  slug: string,
  sourceWeekStart: string,
  repeatWeeks: number,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const start = new Date(sourceWeekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  let total = 0;
  const weeks = Math.min(Math.max(repeatWeeks, 1), 12);

  for (let w = 1; w <= weeks; w++) {
    const targetStart = new Date(start);
    targetStart.setDate(targetStart.getDate() + 7 * w);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetStart.getDate() + 6);

    total += await copyDateRangePlanning(supabase, {
      companyId: ctx.company.id,
      createdBy: ctx.profile.id,
      from,
      to,
      dayOffset: 7 * w,
      targetEnd: targetEnd.toISOString().slice(0, 10),
    });
  }

  revalidateWorkforce(slug);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: { count: total } };
}

export async function optimizeWeekPlanningAction(
  slug: string,
  moves: Array<{ assignmentId: string; employeeId: string; scheduledDate: string }>,
): Promise<ActionResult<{ applied: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  let applied = 0;

  for (const move of moves) {
    const result = await moveShiftAction(slug, move.assignmentId, {
      employeeId: move.employeeId,
      scheduledDate: move.scheduledDate,
    });
    if (result.success) applied += 1;
  }

  revalidateWorkforce(slug);
  return { success: true, data: { applied } };
}

export async function autoPlanRangeAction(
  slug: string,
  assignments: Array<{ taskId: string; employeeId: string }>,
): Promise<ActionResult<{ assigned: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  let assigned = 0;

  for (const item of assignments) {
    const { data: existing } = await supabase
      .from("task_assignments")
      .select("id")
      .eq("task_id", item.taskId)
      .eq("company_id", ctx.company.id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("task_assignments").insert({
      company_id: ctx.company.id,
      task_id: item.taskId,
      employee_id: item.employeeId,
      assigned_by: ctx.profile.id,
    });

    if (!error) {
      await supabase
        .from("tasks")
        .update({ status: "scheduled" })
        .eq("id", item.taskId)
        .eq("company_id", ctx.company.id);
      assigned += 1;
    }
  }

  revalidateWorkforce(slug);
  revalidatePath(`/${slug}/operations/scheduling`);
  void checkPlanningAutomations(ctx.company.id, slug);
  return { success: true, data: { assigned } };
}

export async function applyPlanningRecommendationAction(
  slug: string,
  recommendation: {
    assignmentId?: string;
    targetEmployeeId?: string;
    targetDate?: string;
  },
): Promise<ActionResult> {
  if (!recommendation.assignmentId || !recommendation.targetEmployeeId || !recommendation.targetDate) {
    return { success: false, error: "Recomendação inválida" };
  }
  return moveShiftAction(slug, recommendation.assignmentId, {
    employeeId: recommendation.targetEmployeeId,
    scheduledDate: recommendation.targetDate,
  });
}

export async function createCompanySkillAction(
  slug: string,
  input: CreateCompanySkillInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createCompanySkillSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_skills")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      service_type: parsed.data.serviceType || null,
      description: parsed.data.description || null,
      color: parsed.data.color || "#6366f1",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug);
  return { success: true, data: { id: data.id as string } };
}

export async function deleteCompanySkillAction(
  slug: string,
  skillId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_skills")
    .delete()
    .eq("id", skillId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug);
  return { success: true, data: undefined };
}

export async function assignEmployeeSkillAction(
  slug: string,
  input: AssignEmployeeSkillInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = assignEmployeeSkillSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("employee_skills").upsert({
    company_id: ctx.company.id,
    employee_id: parsed.data.employeeId,
    skill_id: parsed.data.skillId,
    level: parsed.data.level,
    certified_at: parsed.data.certifiedAt || null,
  });

  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug, parsed.data.employeeId);
  return { success: true, data: undefined };
}

export async function removeEmployeeSkillAction(
  slug: string,
  employeeId: string,
  skillId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_skills")
    .delete()
    .eq("employee_id", employeeId)
    .eq("skill_id", skillId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidateWorkforce(slug, employeeId);
  return { success: true, data: undefined };
}
