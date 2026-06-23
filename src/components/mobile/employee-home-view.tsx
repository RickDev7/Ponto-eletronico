"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  LogIn,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { EmployeeJobRow } from "@/lib/employee/load-employee-jobs";
import type { EmployeeHomeData } from "@/lib/employee/load-employee-home";
import {
  formatJobTimeRange,
  getJobAddressLine,
  getJobClientName,
  getJobStartHref,
  taskStatusToMobileVariant,
} from "@/lib/employee/mobile-job-ui";
import {
  AppGreetingHeader,
  AppNextServiceHero,
  AppQuickActionGrid,
  AppScreen,
  AppSectionTitle,
  AppServiceCard,
  AppSummaryGrid,
} from "@/components/mobile/app";
import { offlineCacheKey } from "@/lib/pwa/offline-cache";
import { usePersistOfflineCache } from "@/hooks/employee/use-persist-offline-cache";
import { useOfflineCacheFallback } from "@/hooks/employee/use-offline-cache-fallback";

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function jobDuration(job: EmployeeJobRow) {
  if (!job.scheduled_start || !job.scheduled_end) return undefined;
  const [sh, sm] = job.scheduled_start.split(":").map(Number);
  const [eh, em] = job.scheduled_end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  return formatMinutes(Math.max(0, eh * 60 + em - (sh * 60 + sm)));
}

interface EmployeeHomeViewProps {
  slug: string;
  employeeId: string;
  data: EmployeeHomeData;
}

export function EmployeeHomeView({ slug, employeeId, data: serverData }: EmployeeHomeViewProps) {
  const t = useTranslations("employee.mobile.home");
  const tService = useTranslations("serviceTypes");
  const tStatus = useTranslations("status");
  const cacheKey = offlineCacheKey("home", slug, employeeId);
  usePersistOfflineCache(cacheKey, serverData);
  const data = useOfflineCacheFallback(cacheKey, serverData);

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const displayName = data.firstName
    ? t("greetingName", { name: data.firstName })
    : t("greetingFallback");
  const heroJob = data.currentJob ?? data.nextJob;

  return (
    <AppScreen>
      <AppGreetingHeader
        greeting={t(`greeting.${greetingKey}`)}
        name={displayName}
        notificationsHref={ROUTES.mobileMessages(slug)}
      />

      {heroJob && (
        <AppNextServiceHero
          clientName={getJobClientName(heroJob) ?? heroJob.title}
          address={getJobAddressLine(heroJob)}
          serviceType={heroJob.service_type ? tService(heroJob.service_type) : undefined}
          timeRange={formatJobTimeRange(heroJob)}
          duration={jobDuration(heroJob)}
          priorityLabel={
            heroJob.priority === "high" ? t("priorityHigh") : undefined
          }
          priority={heroJob.priority === "high" ? "high" : "normal"}
          ctaLabel={data.currentJob ? t("actions.openJob") : t("actions.checkIn")}
          ctaHref={getJobStartHref(slug, heroJob.id, {
            isActive: heroJob.id === data.activeTaskId,
            hasOpenCheckIn: Boolean(data.currentJob),
          })}
        />
      )}

      <section className="space-y-3">
        <AppSectionTitle title={t("quickActions")} />
        <AppQuickActionGrid
          actions={[
            {
              label: t("actions.checkIn"),
              icon: LogIn,
              href: heroJob
                ? getJobStartHref(slug, heroJob.id, {
                    isActive: heroJob.id === data.activeTaskId,
                    hasOpenCheckIn: Boolean(data.currentJob),
                  })
                : ROUTES.mobileJobs(slug),
              variant: "primary",
            },
            {
              label: t("actions.viewRoute"),
              icon: Navigation,
              href: ROUTES.mobileSchedule(slug),
            },
            {
              label: t("actions.messages"),
              icon: MessageSquare,
              href: ROUTES.mobileMessages(slug),
            },
            {
              label: t("actions.more"),
              icon: MoreHorizontal,
              href: ROUTES.mobileProfile(slug),
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <AppSectionTitle title={t("dailySummary")} />
        <AppSummaryGrid
          items={[
            {
              label: t("kpis.todayJobs"),
              value: String(data.todayJobsCount),
              icon: CalendarDays,
            },
            {
              label: t("kpis.hoursWorked"),
              value: formatMinutes(data.hoursWorkedMinutes),
              icon: ClipboardCheck,
            },
            {
              label: t("kpis.pendingTasks"),
              value: String(data.pendingCount),
              icon: MapPin,
            },
            {
              label: t("kpis.hoursPlanned"),
              value: formatMinutes(data.hoursPlannedMinutes),
              icon: Navigation,
            },
          ]}
        />
      </section>

      {data.jobs.length > 0 && (
        <section className="space-y-3">
          <AppSectionTitle
            title={t("todayJobs")}
            action={
              <Link
                href={ROUTES.mobileJobs(slug)}
                className="text-sm font-semibold text-[var(--mobile-primary)]"
              >
                {t("seeAll")}
              </Link>
            }
          />
          <div className="space-y-3">
            {data.jobs.slice(0, 3).map((job) => (
              <AppServiceCard
                key={job.id}
                clientName={getJobClientName(job) ?? job.title}
                serviceType={job.service_type ? tService(job.service_type) : job.title}
                timeRange={formatJobTimeRange(job)}
                duration={jobDuration(job)}
                address={getJobAddressLine(job)}
                statusLabel={tStatus(job.status)}
                statusVariant={taskStatusToMobileVariant(job.status)}
                href={ROUTES.mobileService(slug, job.id)}
                onStart={
                  job.status !== "completed"
                    ? getJobStartHref(slug, job.id, {
                        isActive: job.id === data.activeTaskId,
                        hasOpenCheckIn: Boolean(data.currentJob && job.id === data.activeTaskId),
                      })
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}
    </AppScreen>
  );
}
