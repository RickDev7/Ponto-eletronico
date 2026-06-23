import { revalidatePath } from "next/cache";

/** Invalidate employee PWA routes after field actions. */
export function revalidateEmployeeMobilePaths(slug: string, taskId?: string) {
  revalidatePath(`/${slug}/mobile`);
  revalidatePath(`/${slug}/mobile/schedule`);
  revalidatePath(`/${slug}/mobile/hours`);
  revalidatePath(`/${slug}/mobile/reports`);
  revalidatePath(`/${slug}/mobile/vacations`);
  revalidatePath(`/${slug}/mobile/jobs`);
  revalidatePath(`/${slug}/mobile/messages`);
  revalidatePath(`/${slug}/mobile/notifications`);
  if (taskId) {
    revalidatePath(`/${slug}/mobile/services/${taskId}`);
    revalidatePath(`/${slug}/mobile/services/${taskId}/execute`);
    revalidatePath(`/${slug}/mobile/check-in/${taskId}`);
  }
}
