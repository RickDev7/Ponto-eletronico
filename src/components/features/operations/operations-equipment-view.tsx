"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Box,
  History,
  Plus,
  RefreshCw,
  Truck,
  Wrench,
} from "lucide-react";
import {
  assignEquipmentAction,
  completeMaintenanceAction,
  createEquipmentAction,
  createMaintenanceAction,
  deleteEquipmentAction,
  returnEquipmentAction,
} from "@/actions/equipment/actions";
import type { EquipmentDashboardData, EquipmentRow } from "@/lib/equipment/equipment-data";
import { EQUIPMENT_CATEGORIES } from "@/lib/equipment/equipment-data";
import type { ServiceRow } from "@/lib/operations/operations-data";
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

type TabId = "equipment" | "assignments" | "maintenance" | "history";

interface OperationsEquipmentViewProps {
  slug: string;
  data: EquipmentDashboardData;
  employees: WorkforceEmployeeRow[];
  services: ServiceRow[];
  locale: string;
  canWrite: boolean;
}

function relLabel(
  rel:
    | { full_name?: string | null; name?: string; title?: string }
    | Array<{ full_name?: string | null; name?: string; title?: string }>
    | null
    | undefined,
): string {
  if (!rel) return "—";
  const row = Array.isArray(rel) ? rel[0] : rel;
  if (!row) return "—";
  return row.full_name ?? row.name ?? row.title ?? "—";
}

export function OperationsEquipmentView({
  slug,
  data,
  employees,
  services,
  locale,
  canWrite,
}: OperationsEquipmentViewProps) {
  const t = useTranslations("operations.equipment");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("equipment");

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("tool");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");

  const [assignEquipmentId, setAssignEquipmentId] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignServiceId, setAssignServiceId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const [maintEquipmentId, setMaintEquipmentId] = useState("");
  const [maintTitle, setMaintTitle] = useState("");
  const [maintType, setMaintType] = useState("preventive");
  const [maintDate, setMaintDate] = useState("");

  const activeAssignments = data.assignments.filter((a) => !a.returned_at);
  const openMaintenance = data.maintenance.filter(
    (m) => m.status === "scheduled" || m.status === "in_progress",
  );

  const tabs: { id: TabId; label: string; icon: typeof Box }[] = [
    { id: "equipment", label: t("tabs.equipment"), icon: Box },
    { id: "assignments", label: t("tabs.assignments"), icon: Truck },
    { id: "maintenance", label: t("tabs.maintenance"), icon: Wrench },
    { id: "history", label: t("tabs.history"), icon: History },
  ];

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createEquipmentAction(slug, {
        name: name.trim(),
        description,
        category: category as EquipmentRow["category"],
        serialNumber,
        assetTag,
        serviceId: serviceId || null,
      });
      if (result.success) {
        toast.success(t("created"));
        setCreateOpen(false);
        setName("");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleAssign() {
    if (!assignEquipmentId) return;
    startTransition(async () => {
      const result = await assignEquipmentAction(slug, {
        equipmentId: assignEquipmentId,
        employeeId: assignEmployeeId || null,
        serviceId: assignServiceId || null,
        notes: assignNotes,
      });
      if (result.success) {
        toast.success(t("assigned"));
        setAssignOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleReturn(assignmentId: string) {
    startTransition(async () => {
      const result = await returnEquipmentAction(slug, assignmentId);
      if (result.success) {
        toast.success(t("returned"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleScheduleMaintenance() {
    if (!maintEquipmentId || !maintTitle.trim()) return;
    startTransition(async () => {
      const result = await createMaintenanceAction(slug, {
        equipmentId: maintEquipmentId,
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

  function handleCompleteMaintenance(maintenanceId: string) {
    startTransition(async () => {
      const result = await completeMaintenanceAction(slug, { maintenanceId });
      if (result.success) {
        toast.success(t("maintenanceCompleted"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleDelete(equipmentId: string) {
    startTransition(async () => {
      const result = await deleteEquipmentAction(slug, equipmentId);
      if (result.success) {
        toast.success(t("deleted"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                <Truck className="mr-1.5 size-3.5" />
                {t("assign")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMaintOpen(true)}>
                <Wrench className="mr-1.5 size-3.5" />
                {t("scheduleMaintenance")}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t("new")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t("kpis.total"), value: data.kpis.total },
          { label: t("kpis.available"), value: data.kpis.available },
          { label: t("kpis.assigned"), value: data.kpis.assigned },
          { label: t("kpis.maintenance"), value: data.kpis.inMaintenance },
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
        {tab === "equipment" && (
          data.equipment.length === 0 ? (
            <EmptyState icon={Box} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.category")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.service")}</TableHead>
                  <TableHead>{t("columns.employee")}</TableHead>
                  <TableHead>{t("columns.tag")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.serial_number && (
                          <p className="text-[11px] text-muted-foreground">SN: {item.serial_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t(`category.${item.category}`)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status === "available" ? "success" : item.status === "maintenance" ? "warning" : item.status === "assigned" ? "info" : "neutral"}>
                        {t(`status.${item.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {relLabel(item.service)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {relLabel(item.default_employee)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{item.asset_tag ?? "—"}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() => handleDelete(item.id)}
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

        {tab === "assignments" && (
          activeAssignments.length === 0 ? (
            <EmptyState icon={Truck} title={t("empty.assignments")} description={t("empty.assignmentsDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.equipment")}</TableHead>
                  <TableHead>{t("columns.employee")}</TableHead>
                  <TableHead>{t("columns.service")}</TableHead>
                  <TableHead>{t("columns.task")}</TableHead>
                  <TableHead>{t("columns.assignedAt")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{relLabel(row.equipment)}</TableCell>
                    <TableCell>{relLabel(row.employee)}</TableCell>
                    <TableCell>{relLabel(row.service)}</TableCell>
                    <TableCell>{relLabel(row.task)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {new Date(row.assigned_at).toLocaleDateString(dateLocale)}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button variant="outline" size="sm" disabled={pending} onClick={() => handleReturn(row.id)}>
                          <RefreshCw className="mr-1 size-3" />
                          {t("return")}
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
                  <TableHead>{t("columns.equipment")}</TableHead>
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
                    <TableCell>{relLabel(row.equipment)}</TableCell>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{t(`maintenanceType.${row.maintenance_type}`)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status === "completed" ? "success" : row.status === "scheduled" ? "info" : "warning"}>
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

        {tab === "history" && (
          data.history.length === 0 ? (
            <EmptyState icon={History} title={t("empty.history")} description={t("empty.historyDescription")} />
          ) : (
            <div className="divide-y">
              {data.history.map((row) => (
                <div key={row.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{row.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {relLabel(row.equipment)} · {t(`event.${row.event_type}`)}
                      {row.profile ? ` · ${relLabel(row.profile)}` : ""}
                    </p>
                  </div>
                  <time className="text-xs tabular-nums text-muted-foreground">
                    {new Date(row.created_at).toLocaleString(dateLocale)}
                  </time>
                </div>
              ))}
            </div>
          )
        )}
      </OperationsWorkspace>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("new")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("form.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>{t("form.category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "tool")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`category.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("form.serial")}</Label><Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></div>
              <div><Label>{t("form.tag")}</Label><Input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t("form.service")}</Label>
              <Select value={serviceId} onValueChange={(v) => setServiceId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <Button onClick={handleCreate} disabled={pending}>{t("save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assign")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.equipment")}</Label>
              <Select value={assignEquipmentId} onValueChange={(v) => setAssignEquipmentId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {data.equipment.filter((e) => e.status !== "retired").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.employee")}</Label>
              <Select value={assignEmployeeId} onValueChange={(v) => setAssignEmployeeId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.service")}</Label>
              <Select value={assignServiceId} onValueChange={(v) => setAssignServiceId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.notes")}</Label><Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} /></div>
            <Button onClick={handleAssign} disabled={pending}>{t("assign")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("scheduleMaintenance")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.equipment")}</Label>
              <Select value={maintEquipmentId} onValueChange={(v) => setMaintEquipmentId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {data.equipment.filter((e) => e.status !== "retired").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
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
    </OperationsPage>
  );
}
