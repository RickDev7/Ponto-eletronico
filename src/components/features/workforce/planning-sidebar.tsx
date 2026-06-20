"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Copy, Lightbulb, CalendarRange, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  copyWeekPlanningAction,
  copyMonthPlanningAction,
  repeatSchedulePlanningAction,
  optimizeWeekPlanningAction,
} from "@/actions/workforce/actions";
import type { PlanningRecommendation, OptimizeWeekResult } from "@/lib/workforce/planning-data";
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

interface PlanningSidebarProps {
  slug: string;
  weekStart: string;
  monthStart?: string;
  recommendations: PlanningRecommendation[];
  optimizeResult: OptimizeWeekResult;
  canWrite: boolean;
  selectedShiftId: string | null;
  onSelectShift: (id: string | null) => void;
}

export function PlanningSidebar({
  slug,
  weekStart,
  monthStart,
  recommendations,
  optimizeResult,
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
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li
                key={rec.id}
                className="rounded-lg border border-border/40 px-3 py-2 text-xs leading-relaxed"
              >
                {t(rec.messageKey as never, rec.messageParams)}
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
