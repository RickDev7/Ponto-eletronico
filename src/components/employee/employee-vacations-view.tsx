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
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
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

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "neutral",
  cancelled: "neutral",
};

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
    <div className="space-y-4 p-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          {t("new")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryCard label={t("summary.pending")} value={summary.pending} />
        <SummaryCard label={t("summary.upcoming")} value={summary.approvedUpcoming} />
        <SummaryCard label={t("summary.daysApproved")} value={summary.totalDaysApproved} />
      </div>

      {requests.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
          <Palmtree className="mb-3 size-10 text-muted-foreground/30" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("emptyDescription")}</p>
          <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t("new")}
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border border-border/60 bg-card">
          {requests.map((req) => (
            <li key={req.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {formatDateRange(req.start_date, req.end_date, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("submitted")}{" "}
                    {new Date(req.created_at).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <StatusBadge
                  status={STATUS_TONE[req.status] ?? "neutral"}
                  label={tStatus(req.status as "pending")}
                />
              </div>
              {req.notes && (
                <p className="text-sm text-muted-foreground">{req.notes}</p>
              )}
              {req.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleCancel(req.id)}
                >
                  {t("cancel")}
                </Button>
              )}
            </li>
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
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDateRange(start: string, end: string, locale: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const a = new Date(`${start}T12:00:00`).toLocaleDateString(locale, opts);
  const b = new Date(`${end}T12:00:00`).toLocaleDateString(locale, opts);
  return start === end ? a : `${a} → ${b}`;
}
