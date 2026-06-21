"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Copy, Lightbulb, CalendarRange, Repeat, Wand2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  applyPlanningRecommendationAction,
  autoPlanRangeAction,
  copyWeekPlanningAction,
  copyMonthPlanningAction,
  repeatSchedulePlanningAction,
  optimizeWeekPlanningAction,
} from "@/actions/workforce/actions";
import type {
  AutoPlanAssignment,
  PlanningRecommendation,
  OptimizeWeekResult,
} from "@/lib/workforce/planning-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlanningSidebarProps {
  slug: string;
  weekStart: string;
  monthStart?: string;
  recommendations: PlanningRecommendation[];
  optimizeResult: OptimizeWeekResult;
  autoPlanAssignments: AutoPlanAssignment[];
  canWrite: boolean;
}

const PRIORITY_STYLE = {
  high: "border-rose-500/30 bg-rose-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-border/40",
};

export function PlanningSidebar({
  slug,
  weekStart,
  monthStart,
  recommendations,
  optimizeResult,
  autoPlanAssignments,
  canWrite,
}: PlanningSidebarProps) {
  const t = useTranslations("workforce.planning");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState("4");

  function handleCopyWeek() {
    startTransition(async () => {
      const result = await copyWeekPlanningAction(slug, weekStart);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toasts.copiedWeek", { count: result.data.count }));
        router.refresh();
      }
    });
  }

  function handleCopyMonth() {
    if (!monthStart) return;
    startTransition(async () => {
      const result = await copyMonthPlanningAction(slug, monthStart);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toasts.copiedMonth", { count: result.data.count }));
        router.refresh();
      }
    });
  }

  function handleRepeat() {
    const weeks = Number.parseInt(repeatWeeks, 10);
    if (!Number.isFinite(weeks) || weeks < 1) {
      toast.error(t("repeat.invalid"));
      return;
    }
    startTransition(async () => {
      const result = await repeatSchedulePlanningAction(slug, weekStart, weeks);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toasts.repeated", { count: result.data.count, weeks }));
        setRepeatOpen(false);
        router.refresh();
      }
    });
  }

  function handleOptimize() {
    if (optimizeResult.moves.length === 0) {
      toast.info(t("ai.noChanges"));
      return;
    }
    startTransition(async () => {
      const result = await optimizeWeekPlanningAction(slug, optimizeResult.moves);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("ai.applied", { count: result.data.applied }));
        router.refresh();
      }
    });
  }

  function handleAutoPlan() {
    if (autoPlanAssignments.length === 0) {
      toast.info(t("ai.noAutoPlan"));
      return;
    }
    startTransition(async () => {
      const result = await autoPlanRangeAction(
        slug,
        autoPlanAssignments.map((a) => ({ taskId: a.taskId, employeeId: a.employeeId })),
      );
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("ai.autoPlanned", { count: result.data.assigned }));
        router.refresh();
      }
    });
  }

  function handleApplyRec(rec: PlanningRecommendation) {
    if (rec.type !== "move" || !rec.assignmentId) return;
    startTransition(async () => {
      const result = await applyPlanningRecommendationAction(slug, {
        assignmentId: rec.assignmentId,
        targetEmployeeId: rec.targetEmployeeId,
        targetDate: rec.targetDate,
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("recs.applied"));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-semibold">{t("ai.title")}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{t("ai.description")}</p>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={pending}
              onClick={handleAutoPlan}
            >
              <Wand2 className="size-3.5" />
              {t("ai.autoPlan", { count: autoPlanAssignments.length })}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={pending}
              onClick={handleOptimize}
            >
              <Sparkles className="size-3.5" />
              {t("ai.optimizeWeek")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={pending}
              onClick={handleCopyWeek}
            >
              <Copy className="size-3.5" />
              {t("actions.copyWeek")}
            </Button>
            {monthStart && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-full gap-1.5 text-xs"
                disabled={pending}
                onClick={handleCopyMonth}
              >
                <CalendarRange className="size-3.5" />
                {t("actions.copyMonth")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={pending}
              onClick={() => setRepeatOpen(true)}
            >
              <Repeat className="size-3.5" />
              {t("actions.repeatSchedule")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-600" />
          <h3 className="text-sm font-semibold">{t("recs.title")}</h3>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("recs.empty")}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {recommendations.map((rec) => (
              <li
                key={rec.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs leading-relaxed",
                  PRIORITY_STYLE[rec.priority],
                )}
              >
                <p>{t(rec.messageKey as never, rec.messageParams)}</p>
                {canWrite && rec.type === "move" && rec.assignmentId && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleApplyRec(rec)}
                    className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
                  >
                    {t("recs.apply")}
                    <ArrowRight className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={repeatOpen} onOpenChange={setRepeatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("repeat.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="repeat-weeks">{t("repeat.weeks")}</Label>
            <Input
              id="repeat-weeks"
              type="number"
              min={1}
              max={12}
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("repeat.hint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepeatOpen(false)}>
              {t("repeat.cancel")}
            </Button>
            <Button disabled={pending} onClick={handleRepeat}>
              {t("repeat.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
