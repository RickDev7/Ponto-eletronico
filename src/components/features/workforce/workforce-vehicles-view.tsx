"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Car, Gauge, Plus, User, Wrench } from "lucide-react";
import {
  assignDriverAction,
  completeVehicleMaintenanceAction,
  createVehicleAction,
  createVehicleMaintenanceAction,
  deleteVehicleAction,
  endDriverAssignmentAction,
  endVehicleUsageAction,
  logVehicleUsageAction,
} from "@/actions/vehicles/actions";
import type { VehicleDashboardData, VehicleRow } from "@/lib/vehicles/vehicle-data";
import { VEHICLE_FUEL_TYPES, VEHICLE_USAGE_PURPOSES } from "@/lib/vehicles/vehicle-data";
import type { WorkforceEmployeeRow } from "@/lib/workforce/workforce-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type TabId = "vehicles" | "drivers" | "maintenance" | "usage";

interface WorkforceVehiclesViewProps {
  slug: string;
  data: VehicleDashboardData;
  employees: WorkforceEmployeeRow[];
  locale: string;
  canWrite: boolean;
}

function relLabel(
  rel:
    | { full_name?: string | null; name?: string; title?: string; plate_number?: string | null }
    | Array<{ full_name?: string | null; name?: string; title?: string; plate_number?: string | null }>
    | null
    | undefined,
): string {
  if (!rel) return "—";
  const row = Array.isArray(rel) ? rel[0] : rel;
  if (!row) return "—";
  return row.full_name ?? row.name ?? row.title ?? "—";
}

function vehicleLabel(v: VehicleRow): string {
  return v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
}

export function WorkforceVehiclesView({
  slug,
  data,
  employees,
  locale,
  canWrite,
}: WorkforceVehiclesViewProps) {
  const t = useTranslations("workforce.vehicles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("vehicles");

  const [createOpen, setCreateOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [fuelType, setFuelType] = useState("gasoline");
  const [odometer, setOdometer] = useState("");
  const [defaultDriverId, setDefaultDriverId] = useState("");

  const [driverVehicleId, setDriverVehicleId] = useState("");
  const [driverEmployeeId, setDriverEmployeeId] = useState("");
  const [driverPrimary, setDriverPrimary] = useState(true);

  const [maintVehicleId, setMaintVehicleId] = useState("");
  const [maintTitle, setMaintTitle] = useState("");
  const [maintType, setMaintType] = useState("preventive");
  const [maintDate, setMaintDate] = useState("");

  const [usageVehicleId, setUsageVehicleId] = useState("");
  const [usageEmployeeId, setUsageEmployeeId] = useState("");
  const [usagePurpose, setUsagePurpose] = useState("shift");

  const activeDrivers = data.drivers.filter((d) => !d.ended_at);
  const activeUsage = data.usage.filter((u) => !u.ended_at);
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const tabs: { id: TabId; label: string; icon: typeof Car }[] = [
    { id: "vehicles", label: t("tabs.vehicles"), icon: Car },
    { id: "drivers", label: t("tabs.drivers"), icon: User },
    { id: "maintenance", label: t("tabs.maintenance"), icon: Wrench },
    { id: "usage", label: t("tabs.usage"), icon: Gauge },
  ];

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createVehicleAction(slug, {
        name: name.trim(),
        plateNumber: plate,
        make,
        model,
        fuelType: fuelType as VehicleRow["fuel_type"],
        odometerKm: odometer ? Number(odometer) : 0,
        defaultDriverId: defaultDriverId || null,
      });
      if (result.success) {
        toast.success(t("created"));
        setCreateOpen(false);
        setName("");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleAssignDriver() {
    if (!driverVehicleId || !driverEmployeeId) return;
    startTransition(async () => {
      const result = await assignDriverAction(slug, {
        vehicleId: driverVehicleId,
        employeeId: driverEmployeeId,
        isPrimary: driverPrimary,
      });
      if (result.success) {
        toast.success(t("driverAssigned"));
        setDriverOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleScheduleMaintenance() {
    if (!maintVehicleId || !maintTitle.trim()) return;
    startTransition(async () => {
      const result = await createVehicleMaintenanceAction(slug, {
        vehicleId: maintVehicleId,
        title: maintTitle.trim(),
        maintenanceType: maintType as "preventive",
        scheduledDate: maintDate || undefined,
      });
      if (result.success) {
        toast.success(t("maintenanceScheduled"));
        setMaintOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleLogUsage() {
    if (!usageVehicleId) return;
    startTransition(async () => {
      const result = await logVehicleUsageAction(slug, {
        vehicleId: usageVehicleId,
        employeeId: usageEmployeeId || null,
        purpose: usagePurpose as "shift",
      });
      if (result.success) {
        toast.success(t("usageLogged"));
        setUsageOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleEndDriver(id: string) {
    startTransition(async () => {
      const result = await endDriverAssignmentAction(slug, id);
      if (result.success) {
        toast.success(t("driverEnded"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleEndUsage(id: string) {
    startTransition(async () => {
      const result = await endVehicleUsageAction(slug, { usageId: id });
      if (result.success) {
        toast.success(t("usageEnded"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleCompleteMaintenance(id: string) {
    startTransition(async () => {
      const result = await completeVehicleMaintenanceAction(slug, { maintenanceId: id });
      if (result.success) {
        toast.success(t("maintenanceCompleted"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteVehicleAction(slug, id);
      if (result.success) {
        toast.success(t("deleted"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDriverOpen(true)}>
                <User className="mr-1.5 size-3.5" />
                {t("assignDriver")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMaintOpen(true)}>
                <Wrench className="mr-1.5 size-3.5" />
                {t("scheduleMaintenance")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUsageOpen(true)}>
                <Gauge className="mr-1.5 size-3.5" />
                {t("logUsage")}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t("new")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: t("kpis.total"), value: data.kpis.total },
          { label: t("kpis.available"), value: data.kpis.available },
          { label: t("kpis.assigned"), value: data.kpis.assigned },
          { label: t("kpis.maintenance"), value: data.kpis.inMaintenance },
          { label: t("kpis.drivers"), value: data.kpis.activeDrivers },
          { label: t("kpis.activeUsage"), value: data.kpis.activeUsage },
          { label: t("kpis.overdue"), value: data.kpis.overdueMaintenance },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1 border-b border-border px-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <OperationsWorkspace className="overflow-hidden">
        {tab === "vehicles" && (
          data.vehicles.length === 0 ? (
            <EmptyState icon={Car} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.vehicle")}</TableHead>
                  <TableHead>{t("columns.plate")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.driver")}</TableHead>
                  <TableHead>{t("columns.fuel")}</TableHead>
                  <TableHead>{t("columns.odometer")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{v.name}</p>
                        {(v.make || v.model) && (
                          <p className="text-[11px] text-muted-foreground">
                            {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{v.plate_number ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          v.status === "available"
                            ? "success"
                            : v.status === "maintenance"
                              ? "warning"
                              : v.status === "assigned"
                                ? "info"
                                : "neutral"
                        }
                      >
                        {t(`status.${v.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{relLabel(v.default_driver)}</TableCell>
                    <TableCell className="text-sm">{t(`fuel.${v.fuel_type}`)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{v.odometer_km.toLocaleString(dateLocale)} km</TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() => handleDelete(v.id)}
                        >
                          {t("delete")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {tab === "drivers" && (
          activeDrivers.length === 0 ? (
            <EmptyState icon={User} title={t("empty.drivers")} description={t("empty.driversDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.vehicle")}</TableHead>
                  <TableHead>{t("columns.driver")}</TableHead>
                  <TableHead>{t("columns.primary")}</TableHead>
                  <TableHead>{t("columns.assignedAt")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDrivers.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{relLabel(row.vehicle)}</TableCell>
                    <TableCell className="font-medium">{relLabel(row.employee)}</TableCell>
                    <TableCell>{row.is_primary ? t("yes") : t("no")}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {new Date(row.assigned_at).toLocaleDateString(dateLocale)}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => handleEndDriver(row.id)}>
                          {t("endAssignment")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {tab === "maintenance" && (
          data.maintenance.length === 0 ? (
            <EmptyState icon={Wrench} title={t("empty.maintenance")} description={t("empty.maintenanceDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.vehicle")}</TableHead>
                  <TableHead>{t("columns.title")}</TableHead>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.scheduled")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.maintenance.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{relLabel(row.vehicle)}</TableCell>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{t(`maintenanceType.${row.maintenance_type}`)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          row.status === "completed"
                            ? "success"
                            : row.status === "scheduled"
                              ? "info"
                              : "warning"
                        }
                      >
                        {t(`maintenanceStatus.${row.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {row.scheduled_date ?? "—"}
                    </TableCell>
                    {canWrite && row.status !== "completed" && row.status !== "cancelled" && (
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => handleCompleteMaintenance(row.id)}>
                          {t("completeMaintenance")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {tab === "usage" && (
          data.usage.length === 0 ? (
            <EmptyState icon={Gauge} title={t("empty.usage")} description={t("empty.usageDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.vehicle")}</TableHead>
                  <TableHead>{t("columns.driver")}</TableHead>
                  <TableHead>{t("columns.purpose")}</TableHead>
                  <TableHead>{t("columns.shift")}</TableHead>
                  <TableHead>{t("columns.started")}</TableHead>
                  <TableHead>{t("columns.distance")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.usage.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{relLabel(row.vehicle)}</TableCell>
                    <TableCell>{relLabel(row.employee)}</TableCell>
                    <TableCell>{t(`purpose.${row.purpose}`)}</TableCell>
                    <TableCell className="text-sm">{relLabel(row.task)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {new Date(row.started_at).toLocaleString(dateLocale)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {row.distance_km != null ? `${row.distance_km} km` : row.ended_at ? "—" : t("active")}
                    </TableCell>
                    {canWrite && !row.ended_at && (
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => handleEndUsage(row.id)}>
                          {t("endUsage")}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </OperationsWorkspace>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("new")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("form.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("form.plate")}</Label><Input value={plate} onChange={(e) => setPlate(e.target.value)} /></div>
              <div><Label>{t("form.odometer")}</Label><Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("form.make")}</Label><Input value={make} onChange={(e) => setMake(e.target.value)} /></div>
              <div><Label>{t("form.model")}</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t("form.fuel")}</Label>
              <Select value={fuelType} onValueChange={(v) => setFuelType(v ?? "gasoline")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_FUEL_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{t(`fuel.${f}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.defaultDriver")}</Label>
              <Select value={defaultDriverId} onValueChange={(v) => setDefaultDriverId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={pending}>{t("save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={driverOpen} onOpenChange={setDriverOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assignDriver")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.vehicle")}</Label>
              <Select value={driverVehicleId} onValueChange={(v) => setDriverVehicleId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {data.vehicles.filter((v) => v.status !== "retired").map((v) => (
                    <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.driver")}</Label>
              <Select value={driverEmployeeId} onValueChange={(v) => setDriverEmployeeId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={driverPrimary} onChange={(e) => setDriverPrimary(e.target.checked)} />
              {t("form.primaryDriver")}
            </label>
            <Button onClick={handleAssignDriver} disabled={pending}>{t("assignDriver")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("scheduleMaintenance")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.vehicle")}</Label>
              <Select value={maintVehicleId} onValueChange={(v) => setMaintVehicleId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {data.vehicles.filter((v) => v.status !== "retired").map((v) => (
                    <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.title")}</Label><Input value={maintTitle} onChange={(e) => setMaintTitle(e.target.value)} /></div>
            <div>
              <Label>{t("form.type")}</Label>
              <Select value={maintType} onValueChange={(v) => setMaintType(v ?? "preventive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["preventive", "corrective", "inspection", "calibration"] as const).map((mt) => (
                    <SelectItem key={mt} value={mt}>{t(`maintenanceType.${mt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.scheduled")}</Label><Input type="date" value={maintDate} onChange={(e) => setMaintDate(e.target.value)} /></div>
            <Button onClick={handleScheduleMaintenance} disabled={pending}>{t("scheduleMaintenance")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("logUsage")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.vehicle")}</Label>
              <Select value={usageVehicleId} onValueChange={(v) => setUsageVehicleId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {data.vehicles.filter((v) => v.status !== "retired" && v.status !== "maintenance").map((v) => (
                    <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.driver")}</Label>
              <Select value={usageEmployeeId} onValueChange={(v) => setUsageEmployeeId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.purpose")}</Label>
              <Select value={usagePurpose} onValueChange={(v) => setUsagePurpose(v ?? "shift")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_USAGE_PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>{t(`purpose.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLogUsage} disabled={pending}>{t("logUsage")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
