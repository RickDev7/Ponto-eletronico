"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarClock,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cancelRecurringSeries } from "@/actions/tasks/actions";
import { type RecurrenceRule } from "@/lib/recurring/generator";
import {
  createRecurrenceLabelTranslator,
  formatRecurrenceLabel,
} from "@/lib/recurring/format-label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { OperationsPage, OperationsWorkspace } from "@/components/shared/workspace";
import { EmptyState } from "@/components/shared/empty-state";
import type { ServiceType } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

export interface SeriesRow {
  id: string;
  title: string;
  serviceType: string;
  startDate: string;
  recurrenceRule: RecurrenceRule;
  addressLabel: string;
  totalInstances: number;
  openInstances: number;
  completedInstances: number;
  nextDate: string | null;
}

interface SeriesViewProps {
  slug: string;
  rows: SeriesRow[];
}

export function SeriesView({ slug, rows }: SeriesViewProps) {
  const t = useTranslations("tasks");
  const tServiceTypes = useTranslations("serviceTypes");
  const tCalendar = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const locale = useLocale();
  const dateLocale = LOCALE_MAP[locale] ?? locale;
  const recurrenceTr = createRecurrenceLabelTranslator(t, tCalendar);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!cancelId) return;
    setLoading(true);
    const result = await cancelRecurringSeries(slug, cancelId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(tToasts("seriesCancelled", { count: result.data.cancelled }));
    setCancelId(null);
  }

  return (
    <OperationsPage>
      <PageHeader
        compact
        title={t("series.title")}
        description={t("series.description")}
        actions={
          <Link
            href={`/${slug}/tasks`}
            className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[11px] font-medium transition-colors hover:bg-muted/50"
          >
            {t("series.backToTasks")}
          </Link>
        }
      />

      <OperationsWorkspace>
        {rows.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title={t("series.empty.title")}
            description={t("series.empty.description")}
            className="py-16"
          />
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${slug}/tasks/${row.id}`}
                      className="text-[13px] font-semibold hover:text-primary hover:underline underline-offset-2"
                    >
                      {row.title}
                    </Link>
                    <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {tServiceTypes(row.serviceType as ServiceType)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <RefreshCw className="mr-1 inline size-3 opacity-60" />
                    {formatRecurrenceLabel(row.recurrenceRule, recurrenceTr)}
                  </p>
                  {row.addressLabel && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {row.addressLabel}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-0.5 text-[10px] text-muted-foreground">
                    <span>
                      <strong className="font-semibold text-foreground">{row.totalInstances}</strong>{" "}
                      {t("series.instances")}
                    </span>
                    <span>
                      <strong className="font-semibold text-emerald-600">{row.completedInstances}</strong>{" "}
                      {t("series.completedCount")}
                    </span>
                    <span>
                      <strong className="font-semibold text-amber-600">{row.openInstances}</strong>{" "}
                      {t("series.openCount")}
                    </span>
                    {row.nextDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        {t("series.next")}{" "}
                        {new Date(`${row.nextDate}T12:00:00`).toLocaleDateString(dateLocale)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/${slug}/tasks/${row.id}`}
                    className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[11px] font-medium hover:bg-muted/50"
                  >
                    {t("series.open")}
                  </Link>
                  {row.openInstances > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => setCancelId(row.id)}
                    >
                      <XCircle className="size-3.5" />
                      {t("series.stopSeries")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsWorkspace>

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("series.stopSeriesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("series.stopSeriesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={loading}
              className={cn(loading && "opacity-70")}
            >
              {loading && <Loader2 className="animate-spin" />}
              {t("series.stopSeries")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationsPage>
  );
}
