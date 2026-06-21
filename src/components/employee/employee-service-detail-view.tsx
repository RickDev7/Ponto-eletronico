"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  LogIn,
  MapPin,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { ServiceType } from "@/types";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { ServiceMap } from "@/components/employee/service-map";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmployeeServiceDetailViewProps {
  slug: string;
  taskId: string;
  context: ExecutionContext;
}

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
  draft: "neutral",
};

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

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.mobile(slug)}
          className="inline-flex size-9 items-center justify-center rounded-full border"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{task.title}</h1>
          <p className="text-xs text-muted-foreground">
            {tServiceTypes(task.service_type as ServiceType)}
          </p>
        </div>
        <StatusBadge
          status={STATUS_TONE[task.status] ?? "neutral"}
          label={tStatus(task.status as "scheduled")}
          showDot
        />
      </div>

      <ServiceMap latitude={addr?.latitude} longitude={addr?.longitude} height={180} />

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        {client?.name && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("client")}
            </p>
            <p className="font-medium">{client.name}</p>
          </div>
        )}
        {addr && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("address")}
            </p>
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {addr.street}
              {addr.house_number ? ` ${addr.house_number}` : ""}
              <br />
              {addr.postal_code} {addr.city}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3.5" />
            {new Date(`${task.scheduled_date}T12:00:00`).toLocaleDateString(locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
          {task.scheduled_start && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5" />
              {task.scheduled_start.slice(0, 5)}
              {task.scheduled_end ? ` – ${task.scheduled_end.slice(0, 5)}` : ""}
            </div>
          )}
        </div>
        {addr?.access_notes && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            🔑 {addr.access_notes}
          </p>
        )}
        {task.description && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("instructions")}
            </p>
            <p className="text-sm">{task.description}</p>
          </div>
        )}
      </section>

      {checklist.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckSquare className="size-4 text-primary" />
              {t("checklist")}
            </p>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{checklist.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {checklist.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className={cn(
                  "text-sm",
                  item.is_checked ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {item.text}
              </li>
            ))}
            {checklist.length > 5 && (
              <li className="text-xs text-muted-foreground">+{checklist.length - 5} …</li>
            )}
          </ul>
        </section>
      )}

      {serviceReport?.generated_at && (
        <Link
          href={ROUTES.mobileReports(slug)}
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4"
        >
          <FileText className="size-5 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("reportReady")}</p>
            <p className="text-xs text-muted-foreground">{t("viewReports")}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 border-t bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {isCompleted ? (
            <Button asChild variant="outline" className="h-12">
              <Link href={ROUTES.mobileReports(slug)}>{t("viewReports")}</Link>
            </Button>
          ) : isActive ? (
            <Button asChild className="h-12 text-base font-semibold">
              <Link href={ROUTES.mobileServiceExecute(slug, taskId)}>
                {t("continueExecution")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="h-12 text-base font-semibold">
              <Link href={ROUTES.mobileCheckIn(slug, taskId)}>
                <LogIn className="mr-2 size-4" />
                {t("startService")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
