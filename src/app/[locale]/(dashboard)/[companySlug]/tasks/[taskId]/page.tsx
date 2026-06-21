import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrls } from "@/actions/photos/actions";
import { can } from "@/config/permissions";
import { TaskDetailView } from "@/components/features/tasks/task-detail-view";
import { TaskComments } from "@/components/features/tasks/task-comments";
import { TaskChecklist } from "@/components/features/tasks/task-checklist";
import { TaskTagPicker } from "@/components/features/tasks/task-tag-picker";
import { Separator } from "@/components/ui/separator";
import { getCompanyTags, getTaskTags } from "@/actions/tags/actions";
import { loadTaskEventsForTask } from "@/lib/operations/load-operations-hub-data";
import type { TraceableExecution } from "@/lib/operations/traceable-execution-types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks");
  return { title: t("detail.pageTitle") };
}

interface PageProps {
  params: Promise<{ companySlug: string; taskId: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { companySlug, taskId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug });

  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select(`
      *,
      address:addresses(id, label, street, city, latitude, longitude, house_number, postal_code, client:clients(id, name)),
      contract:contracts(id, title, contract_number),
      service:services(id, name),
      assignments:task_assignments(
        id, assigned_at,
        employee:employees(id, full_name, email, phone)
      ),
      photos:task_photos(
        id, photo_type, storage_path, file_name, uploaded_at,
        uploaded_by
      ),
      check_ins(
        id, check_in_at, check_out_at,
        check_in_notes, check_out_notes,
        check_in_latitude, check_in_longitude,
        check_out_latitude, check_out_longitude,
        employee:employees(id, full_name)
      )
    `)
    .eq("id", taskId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!task) notFound();

  const [allTags, taskTags, taskEvents] = await Promise.all([
    getCompanyTags(companySlug),
    getTaskTags(companySlug, taskId),
    loadTaskEventsForTask(ctx.company.id, taskId),
  ]);

  const { data: checklistItems } = await supabase
    .from("task_checklist_items")
    .select("id, text, is_checked, sort_order")
    .eq("task_id", taskId)
    .eq("company_id", ctx.company.id)
    .order("sort_order");

  const { data: allLogs } = await supabase
    .from("activity_logs")
    .select(`*, profile:profiles(full_name)`)
    .eq("entity_id", taskId)
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const activityLogs = (allLogs ?? []).filter((l) => l.action !== "comment");
  const comments = (allLogs ?? [])
    .filter((l) => l.action === "comment")
    .reverse();

  const photos = Array.isArray(task.photos) ? task.photos : [];
  const storagePaths = photos.map((p: { storage_path: string }) => p.storage_path);
  const signedUrls = await getSignedPhotoUrls(storagePaths);

  const openCheckIn = (Array.isArray(task.check_ins) ? task.check_ins : []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ci: any) =>
      !ci.check_out_at &&
      (Array.isArray(ci.employee)
        ? ci.employee[0]?.id
        : ci.employee?.id) === ctx.employee?.id,
  );

  const addr = Array.isArray(task.address) ? task.address[0] : task.address;
  const contract = Array.isArray(task.contract) ? task.contract[0] : task.contract;
  const service = Array.isArray(task.service) ? task.service[0] : task.service;
  const client = Array.isArray(addr?.client) ? addr.client[0] : addr?.client;

  const traceableExecution: TraceableExecution = {
    id: task.id,
    title: task.title,
    status: task.status,
    scheduled_date: task.scheduled_date,
    scheduled_start: task.scheduled_start,
    scheduled_end: task.scheduled_end,
    service_type: task.service_type,
    approved_at: task.approved_at,
    invoice_id: task.invoice_id,
    contract_id: task.contract_id,
    team_id: task.team_id,
    service_id: task.service_id,
    serviceName: service?.name ?? null,
    contractTitle: contract?.title ?? null,
    contractNumber: contract?.contract_number ?? null,
    propertyId: addr?.id ?? null,
    clientName: client?.name ?? null,
    address: addr
      ? { label: addr.label, street: addr.street, city: addr.city, client: addr.client }
      : null,
    assignments: task.assignments as TraceableExecution["assignments"],
  };

  return (
    <div>
      <TaskDetailView
        slug={companySlug}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        task={task as any}
        ctx={ctx}
        signedUrls={signedUrls}
        activityLogs={activityLogs}
        openCheckInId={openCheckIn?.id ?? null}
        canWrite={can(ctx.membership.role, "tasks:write")}
        canUploadPhoto={can(ctx.membership.role, "photos:upload")}
        traceableExecution={traceableExecution}
        taskEvents={taskEvents}
      />
      <div className="max-w-3xl mx-auto px-6 pb-10 space-y-6">
        {/* Checklist section */}
        <div>
          <Separator className="mb-6" />
          {/* Tags section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Tags</h3>
          <TaskTagPicker
            slug={companySlug}
            taskId={taskId}
            allTags={allTags}
            taskTags={taskTags}
            canEdit={can(ctx.membership.role, "tasks:write")}
          />
        </div>

        <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              ☑ Checkliste
              {(checklistItems ?? []).length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({checklistItems!.filter((i) => i.is_checked).length}/
                  {checklistItems!.length})
                </span>
              )}
            </h3>
            <TaskChecklist
              slug={companySlug}
              taskId={taskId}
              items={checklistItems ?? []}
              canEdit={can(ctx.membership.role, "tasks:write")}
            />
          </div>
        </div>

        {/* Comments section */}
        <div>
          <Separator className="mb-6" />
          <TaskComments
            slug={companySlug}
            taskId={taskId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            comments={comments as any}
            currentUserId={ctx.profile.id}
          />
        </div>
      </div>
    </div>
  );
}
