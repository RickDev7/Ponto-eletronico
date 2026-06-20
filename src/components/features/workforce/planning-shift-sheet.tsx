"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, Clock, Copy, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { duplicateShiftAction } from "@/actions/workforce/actions";
import { formatMinutes, shiftDurationMinutes } from "@/lib/workforce/planning-data";
import type { ShiftRow } from "@/lib/workforce/workforce-data";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PlanningShiftSheetProps {
  slug: string;
  shift: ShiftRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canWrite?: boolean;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(11, 16);
}

export function PlanningShiftSheet({
  slug,
  shift,
  open,
  onOpenChange,
  canWrite = false,
}: PlanningShiftSheetProps) {
  const t = useTranslations("workforce.planning.shift");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!shift) return null;

  const duration = formatMinutes(shiftDurationMinutes(shift));

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateShiftAction(slug, shift!.assignmentId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("duplicated"));
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{shift.title}</SheetTitle>
          <SheetDescription>{shift.scheduledDate}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <Link href={ROUTES.workforceEmployee(slug, shift.employeeId)} className="hover:text-primary">
              {shift.employeeName}
            </Link>
          </div>
          {shift.clientName && (
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <span>{shift.clientName}</span>
            </div>
          )}
          {shift.addressLabel && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{shift.addressLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span>
              {formatTime(shift.scheduledStart)} – {formatTime(shift.scheduledEnd)} ({duration})
            </span>
          </div>
          {shift.shiftType && (
            <p>
              <span className="text-muted-foreground">{t("type")}: </span>
              {t(`types.${shift.shiftType}` as never)}
            </p>
          )}
          {(shift.breakMinutes > 0 || shift.travelMinutes > 0) && (
            <p className="text-muted-foreground">
              {shift.breakMinutes > 0 && `${t("break")}: ${shift.breakMinutes} min`}
              {shift.breakMinutes > 0 && shift.travelMinutes > 0 && " · "}
              {shift.travelMinutes > 0 && `${t("travel")}: ${shift.travelMinutes} min`}
            </p>
          )}
          {shift.contractId && (
            <Link
              href={ROUTES.financeContract(slug, shift.contractId)}
              className="inline-block text-primary hover:underline"
            >
              {t("viewContract")}
            </Link>
          )}
          <Link href={ROUTES.task(slug, shift.taskId)} className="inline-block text-primary hover:underline">
            {t("viewTask")}
          </Link>
        </div>
        {canWrite && (
          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              disabled={pending}
              onClick={handleDuplicate}
            >
              <Copy className="size-3.5" />
              {t("duplicate")}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
