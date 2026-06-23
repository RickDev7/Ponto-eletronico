"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  LogIn,
  MapPin,
  Play,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { ServiceType } from "@/types";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { ServiceMap } from "@/components/employee/service-map";
import { EmployeeJobAiWidget } from "@/components/employee/employee-job-ai-widget";
import {
  AppBadge,
  AppCard,
  AppDarkHeader,
  AppScreen,
} from "@/components/mobile/app";
import { taskStatusToMobileVariant } from "@/lib/employee/mobile-job-ui";
import { cn } from "@/lib/utils";

interface EmployeeServiceDetailViewProps {
  slug: string;
  taskId: string;
  context: ExecutionContext;
}

export function EmployeeServiceDetailView({ slug, taskId, context }: EmployeeServiceDetailViewProps) {
  const t = useTranslations("employee.mobile.service");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const locale = useLocale();

  const { task, openCheckIn, checklist, serviceReport } = context;
  const addr = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = addr?.client
    ? Array.isArray(addr.client)
      ? addr.client[0]
      : addr.client
    : null;

  const checkedCount = checklist.filter((i) => i.is_checked).length;
  const isActive = Boolean(openCheckIn);
  const isCompleted = task.status === "completed";
  const progressPct =
    checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0;

  const badgeVariant = (v: ReturnType<typeof taskStatusToMobileVariant>) => {
    if (v === "success") return "success" as const;
    if (v === "warning") return "warning" as const;
    if (v === "danger") return "danger" as const;
    return "primary" as const;
  };

  return (
    <AppScreen immersive className="space-y-0 px-0 pt-0">
      <AppDarkHeader
        title={client?.name ?? task.title}
        subtitle={tServiceTypes(task.service_type as ServiceType)}
        backHref={ROUTES.mobileJobs(slug)}
        progress={checkedCount}
        total={checklist.length || 1}
      />

      <div className="space-y-5 px-[var(--mobile-page-px)] pb-32 pt-4">
        <div className="flex items-center gap-2">
          <AppBadge variant={badgeVariant(taskStatusToMobileVariant(task.status))}>
            {tStatus(task.status)}
          </AppBadge>
          {task.scheduled_start && (
            <span className="text-sm text-[var(--mobile-secondary)]">
              {task.scheduled_start.slice(0, 5)}
              {task.scheduled_end ? ` – ${task.scheduled_end.slice(0, 5)}` : ""}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-[var(--mobile-radius-card)] shadow-[var(--mobile-shadow-card)]">
          <ServiceMap latitude={addr?.latitude} longitude={addr?.longitude} height={180} />
        </div>

        <AppCard className="space-y-4">
          {addr && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--mobile-primary)]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--mobile-secondary)]">
                  {t("address")}
                </p>
                <p className="mt-1 text-base font-medium text-[var(--mobile-text)]">
                  {addr.street}
                  {addr.house_number ? ` ${addr.house_number}` : ""}, {addr.city}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-[var(--mobile-secondary)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {new Date(`${task.scheduled_date}T12:00:00`).toLocaleDateString(locale, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            {checklist.length > 0 && (
              <span className="flex items-center gap-1.5">
                <CheckSquare className="size-4" />
                {progressPct}% {t("checklist")}
              </span>
            )}
          </div>
          {task.description && (
            <p className="rounded-[var(--mobile-radius-button)] bg-[var(--mobile-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--mobile-text)]">
              {task.description}
            </p>
          )}
        </AppCard>

        {!isCompleted && <EmployeeJobAiWidget slug={slug} taskId={taskId} />}

        {checklist.length > 0 && (
          <AppCard>
            <p className="mb-3 flex items-center gap-2 font-semibold text-[var(--mobile-text)]">
              <CheckSquare className="size-5 text-[var(--mobile-primary)]" />
              {t("checklist")}
            </p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--mobile-muted)]">
              <div
                className="h-full rounded-full bg-[var(--mobile-success)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-3">
              {checklist.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 text-base",
                    item.is_checked && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      item.is_checked
                        ? "border-[var(--mobile-success)] bg-[var(--mobile-success)] text-white"
                        : "border-[var(--mobile-border)]",
                    )}
                  >
                    {item.is_checked && "✓"}
                  </span>
                  <span className={item.is_checked ? "line-through" : ""}>{item.text}</span>
                </li>
              ))}
            </ul>
          </AppCard>
        )}

        {serviceReport?.generated_at && (
          <Link
            href={ROUTES.mobileReports(slug)}
            className="mobile-pressable mobile-card flex items-center gap-3 border-[var(--mobile-success)]/30 bg-[var(--mobile-success)]/5 p-4"
          >
            <FileText className="size-5 text-[var(--mobile-success)]" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--mobile-text)]">{t("reportReady")}</p>
              <p className="text-sm text-[var(--mobile-secondary)]">{t("viewReports")}</p>
            </div>
            <ArrowRight className="size-5 text-[var(--mobile-secondary)]" />
          </Link>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mobile-border)] bg-[var(--mobile-card)]/95 p-4 backdrop-blur-xl safe-area-pb">
        <div className="mx-auto max-w-md">
          {isCompleted ? (
            <Link
              href={ROUTES.mobileReports(slug)}
              className="mobile-pressable flex h-[52px] w-full items-center justify-center rounded-[var(--mobile-radius-button)] border border-[var(--mobile-border)] text-base font-semibold"
            >
              {t("viewReports")}
            </Link>
          ) : isActive ? (
            <Link
              href={ROUTES.mobileServiceExecute(slug, taskId)}
              className="mobile-pressable flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] text-base font-semibold text-white"
            >
              <Play className="size-5" />
              {t("continueExecution")}
            </Link>
          ) : (
            <Link
              href={ROUTES.mobileCheckIn(slug, taskId)}
              className="mobile-pressable flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] text-base font-semibold text-white"
            >
              <LogIn className="size-5" />
              {t("startService")}
            </Link>
          )}
        </div>
      </div>
    </AppScreen>
  );
}
