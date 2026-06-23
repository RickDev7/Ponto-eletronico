"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClipboardList } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { EmployeeJobRow } from "@/lib/employee/load-employee-jobs";
import type { TaskStatus } from "@/types";
import {
  formatJobTimeRange,
  getJobAddressLine,
  getJobClientName,
  getJobMapsUrl,
  getJobStartHref,
  taskStatusToMobileVariant,
} from "@/lib/employee/mobile-job-ui";
import {
  AppFilterPills,
  AppScreen,
  AppSectionTitle,
  AppServiceCard,
} from "@/components/mobile/app";
import { offlineCacheKey } from "@/lib/pwa/offline-cache";
import { usePersistOfflineCache } from "@/hooks/employee/use-persist-offline-cache";
import { useOfflineCacheFallback } from "@/hooks/employee/use-offline-cache-fallback";

type JobFilter = "all" | "pending" | "in_progress" | "completed";

interface EmployeeJobsViewProps {
  slug: string;
  employeeId: string;
  today: string;
  jobs: EmployeeJobRow[];
  activeTaskId: string | null;
}

function jobDuration(job: EmployeeJobRow) {
  if (!job.scheduled_start || !job.scheduled_end) return undefined;
  const [sh, sm] = job.scheduled_start.split(":").map(Number);
  const [eh, em] = job.scheduled_end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  const mins = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function EmployeeJobsView({
  slug,
  employeeId,
  today,
  jobs: serverJobs,
  activeTaskId,
}: EmployeeJobsViewProps) {
  const t = useTranslations("employee.mobile.jobs");
  const tStatus = useTranslations("status");
  const tService = useTranslations("serviceTypes");
  const cacheKey = offlineCacheKey("jobs", slug, employeeId);
  const cachePayload = { today, jobs: serverJobs, activeTaskId };
  usePersistOfflineCache(cacheKey, cachePayload);
  const cached = useOfflineCacheFallback(cacheKey, cachePayload);
  const jobs = cached.jobs;
  const resolvedActiveTaskId = cached.activeTaskId;
  const [filter, setFilter] = useState<JobFilter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "pending":
        return jobs.filter((j) => ["draft", "scheduled"].includes(j.status));
      case "in_progress":
        return jobs.filter((j) => j.status === "in_progress");
      case "completed":
        return jobs.filter((j) => j.status === "completed");
      default:
        return jobs;
    }
  }, [filter, jobs]);

  const filterOptions: { key: JobFilter; label: string }[] = [
    { key: "all", label: t("filters.all") },
    { key: "pending", label: t("filters.pending") },
    { key: "in_progress", label: t("filters.inProgress") },
    { key: "completed", label: t("filters.completed") },
  ];

  return (
    <AppScreen>
      <AppSectionTitle title={t("title")} />
      <p className="-mt-4 text-sm text-[var(--mobile-secondary)]">{t("subtitle")}</p>

      <AppFilterPills options={filterOptions} value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="mobile-card flex flex-col items-center px-6 py-12 text-center">
          <ClipboardList className="mb-4 size-12 text-[var(--mobile-secondary)]" strokeWidth={1.25} />
          <h3 className="font-semibold text-[var(--mobile-text)]">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--mobile-secondary)]">{t("emptyDescription")}</p>
          <Link
            href={ROUTES.mobileSchedule(slug)}
            className="mobile-pressable mt-6 inline-flex h-11 items-center rounded-[var(--mobile-radius-button)] border border-[var(--mobile-border)] px-6 text-sm font-medium"
          >
            {t("viewSchedule")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const isActive = job.id === resolvedActiveTaskId;
            return (
              <AppServiceCard
                key={job.id}
                clientName={getJobClientName(job) ?? job.title}
                serviceType={job.service_type ? tService(job.service_type) : job.title}
                timeRange={formatJobTimeRange(job)}
                duration={jobDuration(job)}
                address={getJobAddressLine(job)}
                statusLabel={tStatus(job.status as TaskStatus)}
                statusVariant={taskStatusToMobileVariant(job.status)}
                href={ROUTES.mobileService(slug, job.id)}
                mapsUrl={getJobMapsUrl(job)}
                onStart={
                  job.status !== "completed"
                    ? getJobStartHref(slug, job.id, {
                        isActive,
                        hasOpenCheckIn: isActive,
                      })
                    : undefined
                }
                startLabel={t("actions.start")}
              />
            );
          })}
        </div>
      )}
    </AppScreen>
  );
}
