"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, Car, Clock, Copy, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { duplicateShiftAction } from "@/actions/workforce/actions";
import {
  assignVehicleToShiftAction,
  removeVehicleFromShiftAction,
} from "@/actions/vehicles/actions";
import { formatMinutes, shiftDurationMinutes } from "@/lib/workforce/planning-data";
import type { ShiftRow } from "@/lib/workforce/workforce-data";
import type { VehicleRow } from "@/lib/vehicles/vehicle-data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  vehicles?: VehicleRow[];
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(11, 16);
}

function vehicleLabel(v: VehicleRow): string {
  return v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
}

export function PlanningShiftSheet({
  slug,
  shift,
  open,
  onOpenChange,
  canWrite = false,
  vehicles = [],
}: PlanningShiftSheetProps) {
  const t = useTranslations("workforce.planning.shift");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  if (!shift) return null;

  const duration = formatMinutes(shiftDurationMinutes(shift));
  const assignableVehicles = vehicles.filter(
    (v) => v.status === "available" || v.id === shift.vehicleId,
  );

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

  function handleAssignVehicle() {
    if (!selectedVehicleId) return;
    startTransition(async () => {
      const result = await assignVehicleToShiftAction(slug, {
        vehicleId: selectedVehicleId,
        taskId: shift!.taskId,
        employeeId: shift!.employeeId,
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("vehicleAssigned"));
        router.refresh();
      }
    });
  }

  function handleRemoveVehicle() {
    if (!shift!.usageId) return;
    startTransition(async () => {
      const result = await removeVehicleFromShiftAction(slug, shift!.usageId!);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("vehicleRemoved"));
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
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Car className="size-4 text-muted-foreground" />
              {t("vehicle")}
            </div>
            {shift.vehicleId ? (
              <div className="space-y-2">
                <p>
                  {shift.vehicleName}
                  {shift.vehiclePlate && (
                    <span className="ml-1 font-mono text-muted-foreground">({shift.vehiclePlate})</span>
                  )}
                </p>
                {canWrite && (
                  <Button variant="outline" size="sm" disabled={pending} onClick={handleRemoveVehicle}>
                    {t("removeVehicle")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">{t("noVehicle")}</p>
                {canWrite && assignableVehicles.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedVehicleId} onValueChange={(v) => setSelectedVehicleId(v ?? "")}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {assignableVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={pending || !selectedVehicleId} onClick={handleAssignVehicle}>
                      {t("assignVehicle")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <Link
              href={ROUTES.workforceVehicles(slug)}
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              {t("manageFleet")}
            </Link>
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
