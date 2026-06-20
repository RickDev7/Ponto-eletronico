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
      address:addresses(*, client:clients(id, name)),
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

  const [allTags, taskTags] = await Promise.all([
    getCompanyTags(companySlug),
    getTaskTags(companySlug, taskId),
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
