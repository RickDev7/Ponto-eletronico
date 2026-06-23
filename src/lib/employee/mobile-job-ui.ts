import { ROUTES } from "@/config/constants";
import { buildMapsRouteUrl } from "@/lib/maps";
import type { ScheduleTaskRow } from "@/lib/field-execution/field-execution-types";
import type { TaskStatus } from "@/types";

/** Maps task status to `AppBadge` variants in `@/components/mobile/app`. */
export type MobileJobStatusVariant = "default" | "primary" | "success" | "warning" | "danger";

export function getJobStartHref(
  slug: string,
  jobId: string,
  options: { isActive: boolean; hasOpenCheckIn: boolean },
): string {
  if (options.isActive || options.hasOpenCheckIn) {
    return ROUTES.mobileServiceExecute(slug, jobId);
  }
  return ROUTES.mobileCheckIn(slug, jobId);
}

export function getJobPrimaryHref(
  slug: string,
  jobId: string,
  options: { isActive: boolean; hasOpenCheckIn: boolean },
): string {
  if (options.isActive || options.hasOpenCheckIn) {
    return ROUTES.mobileServiceExecute(slug, jobId);
  }
  return ROUTES.mobileService(slug, jobId);
}

export function getJobClientName(job: ScheduleTaskRow): string | null {
  const addr = Array.isArray(job.address) ? job.address[0] : job.address;
  const client = addr?.client;
  const name = Array.isArray(client) ? client[0]?.name : client?.name;
  return name ?? null;
}

export function getJobAddressLine(job: ScheduleTaskRow): string | null {
  const addr = Array.isArray(job.address) ? job.address[0] : job.address;
  if (!addr) return null;
  return `${addr.street}${addr.house_number ? ` ${addr.house_number}` : ""}, ${addr.city}`;
}

export function getJobMapsUrl(job: ScheduleTaskRow): string | null {
  const addr = Array.isArray(job.address) ? job.address[0] : job.address;
  return buildMapsRouteUrl(addr);
}

export function formatJobTimeRange(job: ScheduleTaskRow): string | null {
  if (!job.scheduled_start) return null;
  const start = job.scheduled_start.slice(0, 5);
  const end = job.scheduled_end ? job.scheduled_end.slice(0, 5) : null;
  return end ? `${start} – ${end}` : start;
}

export function taskStatusToMobileVariant(status: string): MobileJobStatusVariant {
  const map: Record<TaskStatus, MobileJobStatusVariant> = {
    draft: "default",
    scheduled: "primary",
    in_progress: "warning",
    completed: "success",
    cancelled: "danger",
  };
  return map[status as TaskStatus] ?? "primary";
}
