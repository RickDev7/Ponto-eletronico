"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { upsertWorktimePolicyAction } from "@/actions/workforce/actions";
import type { WorktimePolicyRow } from "@/lib/workforce/workforce-data";
import { OperationsPage, OperationsWorkspace, PageHeader, OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WorkforceWorktimeViewProps {
  slug: string;
  policy: WorktimePolicyRow | null;
  canWrite: boolean;
}

export function WorkforceWorktimeView({ slug, policy, canWrite }: WorkforceWorktimeViewProps) {
  const t = useTranslations("workforce.worktime");
  const [pending, startTransition] = useTransition();
  const [workStart, setWorkStart] = useState(policy?.work_start?.slice(0, 5) ?? "08:00");
  const [workEnd, setWorkEnd] = useState(policy?.work_end?.slice(0, 5) ?? "17:00");
  const [breakMinutes, setBreakMinutes] = useState(String(policy?.break_minutes ?? 30));
  const [maxDaily, setMaxDaily] = useState(String(policy?.max_daily_hours ?? 10));
  const [maxWeekly, setMaxWeekly] = useState(String(policy?.max_weekly_hours ?? 48));
  const [overtime, setOvertime] = useState(String(policy?.overtime_threshold_hours ?? 8));

  function handleSave() {
    startTransition(async () => {
      const result = await upsertWorktimePolicyAction(slug, {
        workStart,
        workEnd,
        breakMinutes: parseInt(breakMinutes, 10),
        maxDailyHours: parseFloat(maxDaily),
        maxWeeklyHours: parseFloat(maxWeekly),
        overtimeThresholdHours: parseFloat(overtime),
      });
      if (result.success) toast.success(t("saved"));
      else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />
      <OperationsWorkspace>
        <div className={cn(OPERATIONS_FORM_CLASS, "max-w-xl space-y-4 p-4")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{t("form.start")}</Label><Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} disabled={!canWrite} /></div>
            <div><Label>{t("form.end")}</Label><Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} disabled={!canWrite} /></div>
            <div><Label>{t("form.break")}</Label><Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} disabled={!canWrite} /></div>
            <div><Label>{t("form.maxDaily")}</Label><Input type="number" step="0.5" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} disabled={!canWrite} /></div>
            <div><Label>{t("form.maxWeekly")}</Label><Input type="number" step="0.5" value={maxWeekly} onChange={(e) => setMaxWeekly(e.target.value)} disabled={!canWrite} /></div>
            <div><Label>{t("form.overtime")}</Label><Input type="number" step="0.5" value={overtime} onChange={(e) => setOvertime(e.target.value)} disabled={!canWrite} /></div>
          </div>
          {canWrite && <Button onClick={handleSave} disabled={pending}>{t("form.save")}</Button>}
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
