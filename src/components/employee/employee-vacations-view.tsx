"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Palmtree, Plus } from "lucide-react";
import {
  cancelEmployeeVacationAction,
  requestEmployeeVacationAction,
} from "@/actions/employee/vacations";
import {
  employeeVacationRequestSchema,
  type EmployeeVacationRequestFormValues,
} from "@/lib/validations/employee-vacations";
import type {
  EmployeeVacationRow,
  EmployeeVacationSummary,
} from "@/lib/employee/load-employee-vacations";
import {
  AppBadge,
  AppCard,
  AppPageHeader,
  AppScreen,
  AppSummaryGrid,
  AppButton,
} from "@/components/mobile/app";
import { ROUTES } from "@/config/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Button } from "@/components/ui/button";

interface EmployeeVacationsViewProps {
  slug: string;
  requests: EmployeeVacationRow[];
  summary: EmployeeVacationSummary;
}

export function EmployeeVacationsView({ slug, requests, summary }: EmployeeVacationsViewProps) {
  const t = useTranslations("employee.mobile.vacations");
  const tStatus = useTranslations("employee.mobile.vacations.status");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<EmployeeVacationRequestFormValues>({
    resolver: zodResolver(employeeVacationRequestSchema),
    defaultValues: { startDate: "", endDate: "", notes: "" },
  });

  function onSubmit(values: EmployeeVacationRequestFormValues) {
    startTransition(async () => {
      const result = await requestEmployeeVacationAction(
        slug,
        employeeVacationRequestSchema.parse(values),
      );
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCancel(requestId: string) {
    startTransition(async () => {
      const result = await cancelEmployeeVacationAction(slug, requestId);
      if (result.success) {
        toast.success(t("cancelled"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AppScreen>
      <div className="flex items-start justify-between gap-3">
        <AppPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          backHref={ROUTES.mobileProfile(slug)}
        />
        <Button
          className="mt-1 h-11 shrink-0 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)]"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <AppSummaryGrid
        items={[
          { label: t("summary.pending"), value: String(summary.pending), icon: Palmtree },
          { label: t("summary.upcoming"), value: String(summary.approvedUpcoming), icon: Palmtree },
          { label: t("summary.daysApproved"), value: String(summary.totalDaysApproved), icon: Palmtree },
        ]}
      />

      {requests.length === 0 ? (
        <AppCard className="flex min-h-[40vh] flex-col items-center justify-center py-12 text-center">
          <Palmtree className="mb-3 size-10 text-[var(--mobile-secondary)]/40" />
          <p className="text-base font-semibold text-[var(--mobile-text)]">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-[var(--mobile-secondary)]">{t("emptyDescription")}</p>
          <AppButton className="mt-4 w-auto px-6" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            {t("new")}
          </AppButton>
        </AppCard>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <AppCard key={req.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--mobile-text)]">
                    {formatDateRange(req.start_date, req.end_date, locale)}
                  </p>
                  <p className="text-sm text-[var(--mobile-secondary)]">
                    {t("submitted")}{" "}
                    {new Date(req.created_at).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <AppBadge
                  variant={
                    req.status === "approved"
                      ? "success"
                      : req.status === "pending"
                        ? "warning"
                        : "default"
                  }
                >
                  {tStatus(req.status as "pending")}
                </AppBadge>
              </div>
              {req.notes && (
                <p className="text-sm text-[var(--mobile-secondary)]">{req.notes}</p>
              )}
              {req.status === "pending" && (
                <Button
                  variant="outline"
                  className="h-11 rounded-[var(--mobile-radius-button)]"
                  disabled={pending}
                  onClick={() => handleCancel(req.id)}
                >
                  {t("cancel")}
                </Button>
              )}
            </AppCard>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("formTitle")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("startDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("endDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} placeholder={t("notesPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("submit")}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}

function formatDateRange(start: string, end: string, locale: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const a = new Date(`${start}T12:00:00`).toLocaleDateString(locale, opts);
  const b = new Date(`${end}T12:00:00`).toLocaleDateString(locale, opts);
  return start === end ? a : `${a} → ${b}`;
}
