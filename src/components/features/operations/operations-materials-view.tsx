"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Boxes, Link2, Package, Plus, ShoppingCart, TrendingDown } from "lucide-react";
import {
  createMaterialAction,
  deleteMaterialAction,
  linkMaterialServiceAction,
  recordConsumptionAction,
  recordPurchaseAction,
  recordUsageAction,
} from "@/actions/materials/actions";
import type { MaterialDashboardData, MaterialRow } from "@/lib/materials/material-data";
import { isLowStock, MATERIAL_UNITS } from "@/lib/materials/material-data";
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

type TabId = "stock" | "purchases" | "usage" | "consumption";

interface OperationsMaterialsViewProps {
  slug: string;
  data: MaterialDashboardData;
  services: ServiceRow[];
  employees: WorkforceEmployeeRow[];
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

export function OperationsMaterialsView({
  slug,
  data,
  services,
  employees,
  locale,
  canWrite,
}: OperationsMaterialsViewProps) {
  const t = useTranslations("operations.materials");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("stock");

  const [createOpen, setCreateOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("piece");
  const [minStock, setMinStock] = useState("0");
  const [serviceId, setServiceId] = useState("");

  const [purchaseMaterialId, setPurchaseMaterialId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [vendor, setVendor] = useState("");

  const [usageMaterialId, setUsageMaterialId] = useState("");
  const [usageQty, setUsageQty] = useState("");
  const [usageEmployeeId, setUsageEmployeeId] = useState("");
  const [usageServiceId, setUsageServiceId] = useState("");

  const [consumptionMaterialId, setConsumptionMaterialId] = useState("");
  const [consumptionServiceId, setConsumptionServiceId] = useState("");
  const [consumptionQty, setConsumptionQty] = useState("");

  const [linkMaterialId, setLinkMaterialId] = useState("");
  const [linkServiceId, setLinkServiceId] = useState("");
  const [linkQty, setLinkQty] = useState("1");

  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const activeMaterials = data.materials.filter((m) => m.is_active);

  const tabs: { id: TabId; label: string; icon: typeof Boxes }[] = [
    { id: "stock", label: t("tabs.stock"), icon: Boxes },
    { id: "purchases", label: t("tabs.purchases"), icon: ShoppingCart },
    { id: "usage", label: t("tabs.usage"), icon: Package },
    { id: "consumption", label: t("tabs.consumption"), icon: TrendingDown },
  ];

  function stockStatus(m: MaterialRow): "success" | "warning" | "danger" {
    if (m.quantity_on_hand <= 0) return "danger";
    if (isLowStock(m)) return "warning";
    return "success";
  }

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createMaterialAction(slug, {
        name: name.trim(),
        sku,
        unit: unit as MaterialRow["unit"],
        minStockLevel: Number(minStock) || 0,
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

  function handlePurchase() {
    if (!purchaseMaterialId || !purchaseQty) return;
    startTransition(async () => {
      const result = await recordPurchaseAction(slug, {
        materialId: purchaseMaterialId,
        quantity: Number(purchaseQty),
        unitCostCents: purchaseCost ? Math.round(Number(purchaseCost) * 100) : undefined,
        vendor,
      });
      if (result.success) {
        toast.success(t("purchaseRecorded"));
        setPurchaseOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleUsage() {
    if (!usageMaterialId || !usageQty) return;
    startTransition(async () => {
      const result = await recordUsageAction(slug, {
        materialId: usageMaterialId,
        quantity: Number(usageQty),
        employeeId: usageEmployeeId || null,
        serviceId: usageServiceId || null,
      });
      if (result.success) {
        toast.success(t("usageRecorded"));
        setUsageOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleConsumption() {
    if (!consumptionMaterialId || !consumptionServiceId || !consumptionQty) return;
    startTransition(async () => {
      const result = await recordConsumptionAction(slug, {
        materialId: consumptionMaterialId,
        serviceId: consumptionServiceId,
        quantity: Number(consumptionQty),
      });
      if (result.success) {
        toast.success(t("consumptionRecorded"));
        setConsumptionOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleLinkService() {
    if (!linkMaterialId || !linkServiceId) return;
    startTransition(async () => {
      const result = await linkMaterialServiceAction(slug, {
        materialId: linkMaterialId,
        serviceId: linkServiceId,
        quantityPerService: Number(linkQty) || 1,
      });
      if (result.success) {
        toast.success(t("serviceLinked"));
        setLinkOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMaterialAction(slug, id);
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
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Link2 className="mr-1.5 size-3.5" />
                {t("linkService")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPurchaseOpen(true)}>
                <ShoppingCart className="mr-1.5 size-3.5" />
                {t("recordPurchase")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUsageOpen(true)}>
                <Package className="mr-1.5 size-3.5" />
                {t("recordUsage")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConsumptionOpen(true)}>
                <TrendingDown className="mr-1.5 size-3.5" />
                {t("recordConsumption")}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t("new")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: t("kpis.total"), value: data.kpis.total },
          { label: t("kpis.lowStock"), value: data.kpis.lowStock },
          { label: t("kpis.outOfStock"), value: data.kpis.outOfStock },
          { label: t("kpis.purchasesMonth"), value: data.kpis.purchasesMonth },
          { label: t("kpis.usageMonth"), value: data.kpis.usageMonth },
          { label: t("kpis.consumptionMonth"), value: data.kpis.consumptionMonth },
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
        {tab === "stock" && (
          activeMaterials.length === 0 ? (
            <EmptyState icon={Boxes} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.material")}</TableHead>
                  <TableHead>{t("columns.sku")}</TableHead>
                  <TableHead>{t("columns.stock")}</TableHead>
                  <TableHead>{t("columns.min")}</TableHead>
                  <TableHead>{t("columns.service")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  {canWrite && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMaterials.map((m) => {
                  const links = data.serviceLinks.filter((l) => l.material_id === m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          {links.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              {t("linkedServices", { count: links.length })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.sku ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">
                        {m.quantity_on_hand} {t(`unit.${m.unit}`)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {m.min_stock_level} {t(`unit.${m.unit}`)}
                      </TableCell>
                      <TableCell className="text-sm">{relLabel(m.service)}</TableCell>
                      <TableCell>
                        <StatusBadge status={stockStatus(m)}>
                          {m.quantity_on_hand <= 0
                            ? t("stockStatus.out")
                            : isLowStock(m)
                              ? t("stockStatus.low")
                              : t("stockStatus.ok")}
                        </StatusBadge>
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={pending}
                            onClick={() => handleDelete(m.id)}
                          >
                            {t("delete")}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        )}

        {tab === "purchases" && (
          data.purchases.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t("empty.purchases")} description={t("empty.purchasesDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.material")}</TableHead>
                  <TableHead>{t("columns.quantity")}</TableHead>
                  <TableHead>{t("columns.vendor")}</TableHead>
                  <TableHead>{t("columns.cost")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{relLabel(row.material)}</TableCell>
                    <TableCell className="tabular-nums">{row.quantity}</TableCell>
                    <TableCell>{row.vendor ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.total_cost_cents != null
                        ? (row.total_cost_cents / 100).toLocaleString(dateLocale, { style: "currency", currency: "EUR" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{row.purchased_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {tab === "usage" && (
          data.usage.length === 0 ? (
            <EmptyState icon={Package} title={t("empty.usage")} description={t("empty.usageDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.material")}</TableHead>
                  <TableHead>{t("columns.quantity")}</TableHead>
                  <TableHead>{t("columns.employee")}</TableHead>
                  <TableHead>{t("columns.service")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.usage.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{relLabel(row.material)}</TableCell>
                    <TableCell className="tabular-nums">{row.quantity}</TableCell>
                    <TableCell>{relLabel(row.employee)}</TableCell>
                    <TableCell>{relLabel(row.service)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {new Date(row.used_at).toLocaleString(dateLocale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {tab === "consumption" && (
          data.consumption.length === 0 ? (
            <EmptyState icon={TrendingDown} title={t("empty.consumption")} description={t("empty.consumptionDescription")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("columns.material")}</TableHead>
                  <TableHead>{t("columns.quantity")}</TableHead>
                  <TableHead>{t("columns.service")}</TableHead>
                  <TableHead>{t("columns.employee")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.consumption.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{relLabel(row.material)}</TableCell>
                    <TableCell className="tabular-nums">{row.quantity}</TableCell>
                    <TableCell>{relLabel(row.service)}</TableCell>
                    <TableCell>{relLabel(row.employee)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {new Date(row.consumed_at).toLocaleString(dateLocale)}
                    </TableCell>
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
              <div><Label>{t("form.sku")}</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
              <div><Label>{t("form.minStock")}</Label><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
            </div>
            <div>
              <Label>{t("form.unit")}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v ?? "piece")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{t(`unit.${u}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleCreate} disabled={pending}>{t("save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recordPurchase")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.material")}</Label>
              <Select value={purchaseMaterialId} onValueChange={(v) => setPurchaseMaterialId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {activeMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("form.quantity")}</Label><Input type="number" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} /></div>
              <div><Label>{t("form.unitCost")}</Label><Input type="number" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} /></div>
            </div>
            <div><Label>{t("form.vendor")}</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
            <Button onClick={handlePurchase} disabled={pending}>{t("recordPurchase")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recordUsage")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.material")}</Label>
              <Select value={usageMaterialId} onValueChange={(v) => setUsageMaterialId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {activeMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.quantity")}</Label><Input type="number" value={usageQty} onChange={(e) => setUsageQty(e.target.value)} /></div>
            <div>
              <Label>{t("form.employee")}</Label>
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
              <Label>{t("form.service")}</Label>
              <Select value={usageServiceId} onValueChange={(v) => setUsageServiceId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUsage} disabled={pending}>{t("recordUsage")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={consumptionOpen} onOpenChange={setConsumptionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recordConsumption")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.material")}</Label>
              <Select value={consumptionMaterialId} onValueChange={(v) => setConsumptionMaterialId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {activeMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.service")}</Label>
              <Select value={consumptionServiceId} onValueChange={(v) => setConsumptionServiceId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.quantity")}</Label><Input type="number" value={consumptionQty} onChange={(e) => setConsumptionQty(e.target.value)} /></div>
            <Button onClick={handleConsumption} disabled={pending}>{t("recordConsumption")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("linkService")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("form.material")}</Label>
              <Select value={linkMaterialId} onValueChange={(v) => setLinkMaterialId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {activeMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.service")}</Label>
              <Select value={linkServiceId} onValueChange={(v) => setLinkServiceId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("form.qtyPerService")}</Label><Input type="number" value={linkQty} onChange={(e) => setLinkQty(e.target.value)} /></div>
            <Button onClick={handleLinkService} disabled={pending}>{t("linkService")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
