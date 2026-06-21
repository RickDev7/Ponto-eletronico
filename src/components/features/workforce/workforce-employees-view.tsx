"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  FileSpreadsheet,
  LayoutGrid,
  List,
  Mail,
  Calendar,
  MoreHorizontal,
  Plus,
  Search,
  Smartphone,
  Table2,
  Trash2,
  Users,
} from "lucide-react";
import { deleteEmployee } from "@/actions/employees/actions";
import { ROUTES } from "@/config/constants";
import {
  computeEmployeesHubKpis,
  filterEmployeesHub,
  type EmployeeHubFilters,
  type EmployeeViewMode,
  type WorkforceEmployeeHubRow,
} from "@/lib/workforce/employees-hub";
import { employeeName } from "@/lib/workforce/workforce-data";
import { EmployeeCard } from "@/components/features/workforce/employees/employee-card";
import { EmployeeCreateDialog } from "@/components/features/workforce/employees/employee-create-dialog";
import { EmployeeImportDialog } from "@/components/features/workforce/employees/employee-import-dialog";
import { EmployeeInviteDialog } from "@/components/features/workforce/employees/employee-invite-dialog";
import { EmployeeRegisterPwaDialog } from "@/components/features/workforce/employees/employee-register-pwa-dialog";
import { EmployeesHubKpiStrip } from "@/components/features/workforce/employees/employees-hub-kpi-strip";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  on_vacation: "info",
  absent: "warning",
  inactive: "neutral",
  terminated: "neutral",
};

const DEFAULT_FILTERS: EmployeeHubFilters = {
  query: "",
  status: "all",
  teamId: "all",
  supervisorId: "all",
  skillId: "all",
  availability: "all",
};

interface WorkforceEmployeesViewProps {
  slug: string;
  employees: WorkforceEmployeeHubRow[];
  teams: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string }>;
  supervisors: Array<{ id: string; full_name: string }>;
  canWrite: boolean;
  canDelete?: boolean;
}

export function WorkforceEmployeesView({
  slug,
  employees,
  teams,
  skills,
  supervisors,
  canWrite,
  canDelete = false,
}: WorkforceEmployeesViewProps) {
  const t = useTranslations("workforce.employees");
  const tRegister = useTranslations("workforce.employees.registerPwa");
  const tStatus = useTranslations("workforce.status");
  const tDialogs = useTranslations("dialogs.deactivateEmployee");
  const router = useRouter();

  const [filters, setFilters] = useState<EmployeeHubFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<EmployeeViewMode>("cards");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerEmployeeId, setRegisterEmployeeId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkforceEmployeeHubRow | null>(null);

  function openRegisterDialog(employeeId?: string) {
    setRegisterEmployeeId(employeeId ?? null);
    setRegisterOpen(true);
  }

  async function handleDeleteEmployee() {
    if (!deleteTarget) return;
    const result = await deleteEmployee(slug, deleteTarget.id);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success(t("toasts.deleted"));
      router.refresh();
    }
    setDeleteTarget(null);
  }

  const kpis = useMemo(() => computeEmployeesHubKpis(employees), [employees]);
  const filtered = useMemo(
    () => filterEmployeesHub(employees, filters),
    [employees, filters],
  );

  const headerActions = (
    <>
      <Button size="sm" variant="outline" asChild>
        <Link href={ROUTES.workforcePlanning(slug)}>
          <Calendar className="mr-1.5 size-3.5" />
          {t("actions.openPlanning")}
        </Link>
      </Button>
      {canWrite ? (
        <>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-1.5 size-3.5" />
            {t("actions.import")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
            <Mail className="mr-1.5 size-3.5" />
            {t("actions.invite")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openRegisterDialog()}>
            <Smartphone className="mr-1.5 size-3.5" />
            {t("actions.registerMobile")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t("actions.create")}
          </Button>
        </>
      ) : null}
    </>
  );

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        size="lg"
        actions={headerActions}
      />

      {employees.length > 0 ? (
        <div className="mb-4">
          <EmployeesHubKpiStrip
            kpis={kpis}
            labels={{
              total: t("kpi.total"),
              active: t("kpi.active"),
              onVacation: t("kpi.onVacation"),
              absentToday: t("kpi.absentToday"),
              plannedHours: t("kpi.plannedHours"),
              workedHours: t("kpi.workedHours"),
            }}
          />
        </div>
      ) : null}

      <OperationsWorkspace className="overflow-hidden">
        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            size="lg"
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              canWrite ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    {t("empty.primary")}
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <FileSpreadsheet className="mr-1.5 size-4" />
                    {t("empty.secondary")}
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder={t("searchPlaceholder")}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  value={filters.status}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                  label={t("filters.status")}
                  options={[
                    { value: "all", label: t("filters.all") },
                    { value: "active", label: tStatus("active") },
                    { value: "on_vacation", label: tStatus("on_vacation") },
                    { value: "absent", label: tStatus("absent") },
                    { value: "inactive", label: tStatus("inactive") },
                  ]}
                />
                <FilterSelect
                  value={filters.teamId}
                  onChange={(v) => setFilters((f) => ({ ...f, teamId: v }))}
                  label={t("filters.team")}
                  options={[
                    { value: "all", label: t("filters.all") },
                    ...teams.map((team) => ({ value: team.id, label: team.name })),
                  ]}
                />
                <FilterSelect
                  value={filters.supervisorId}
                  onChange={(v) => setFilters((f) => ({ ...f, supervisorId: v }))}
                  label={t("filters.supervisor")}
                  options={[
                    { value: "all", label: t("filters.all") },
                    ...supervisors.map((s) => ({ value: s.id, label: s.full_name })),
                  ]}
                />
                <FilterSelect
                  value={filters.skillId}
                  onChange={(v) => setFilters((f) => ({ ...f, skillId: v }))}
                  label={t("filters.skill")}
                  options={[
                    { value: "all", label: t("filters.all") },
                    ...skills.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <FilterSelect
                  value={filters.availability}
                  onChange={(v) => setFilters((f) => ({ ...f, availability: v }))}
                  label={t("filters.availability")}
                  options={[
                    { value: "all", label: t("filters.all") },
                    { value: "available", label: t("availability.available") },
                    { value: "limited", label: t("availability.limited") },
                    { value: "overbooked", label: t("availability.overbooked") },
                    { value: "unavailable", label: t("availability.unavailable") },
                  ]}
                />
                <ViewToggle
                  viewMode={viewMode}
                  onChange={(mode) => {
                    if (mode === "planning") {
                      router.push(ROUTES.workforcePlanning(slug));
                      return;
                    }
                    setViewMode(mode);
                  }}
                  t={t}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("emptyFiltered.title")}
                description={t("emptyFiltered.description")}
              />
            ) : viewMode === "planning" ? null : viewMode === "cards" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    slug={slug}
                    employee={emp}
                    canWrite={canWrite}
                    canDelete={canDelete}
                    onEdit={() => router.push(ROUTES.workforceEmployee(slug, emp.id))}
                    onRegisterMobile={
                      canWrite && !emp.hasMobileAccess
                        ? () => openRegisterDialog(emp.id)
                        : undefined
                    }
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("columns.name")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("columns.role")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("columns.team")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("columns.supervisor")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("columns.hours")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("columns.mobile")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead className="w-7" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Link
                          href={ROUTES.workforceEmployee(slug, emp.id)}
                          className="font-medium hover:text-primary"
                        >
                          {emp.full_name}
                        </Link>
                        {emp.email ? (
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {emp.job_title ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {emp.teamName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {employeeName(emp.supervisor)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                        {emp.weekly_hours ?? 40}h
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge
                          status={emp.hasMobileAccess ? "success" : "neutral"}
                          label={
                            emp.hasMobileAccess
                              ? tRegister("mobileActive")
                              : tRegister("mobilePending")
                          }
                          showDot
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={STATUS_TONE[emp.status] ?? "neutral"}
                          label={tStatus(emp.status as "active")}
                          showDot
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className={ROW_ACTION_TRIGGER_CLASS}>
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              onSelect={() => router.push(ROUTES.workforceEmployee(slug, emp.id))}
                            >
                              {t("actions.profile")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(
                                  ROUTES.workforcePlanning(slug, { employee: emp.id }),
                                )
                              }
                            >
                              <Calendar className="size-3.5" />
                              {t("actions.plan")}
                            </DropdownMenuItem>
                            {canDelete && emp.status !== "terminated" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => setDeleteTarget(emp)}
                                >
                                  <Trash2 className="size-3.5" />
                                  {t("actions.delete")}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </OperationsWorkspace>

      {canWrite ? (
        <>
          <EmployeeCreateDialog
            slug={slug}
            open={createOpen}
            onOpenChange={setCreateOpen}
            teams={teams}
            supervisors={supervisors}
            skills={skills}
          />
          <EmployeeInviteDialog
            slug={slug}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            teams={teams}
          />
          <EmployeeRegisterPwaDialog
            slug={slug}
            open={registerOpen}
            onOpenChange={setRegisterOpen}
            employees={employees}
            preselectedEmployeeId={registerEmployeeId}
          />
          <EmployeeImportDialog
            slug={slug}
            open={importOpen}
            onOpenChange={setImportOpen}
            teams={teams}
          />
        </>
      ) : null}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDialogs("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("dialogs.deleteDescription", { name: deleteTarget.full_name })
                : tDialogs("description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDialogs("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationsPage>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger className="h-9 w-[140px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ViewToggle({
  viewMode,
  onChange,
  t,
}: {
  viewMode: EmployeeViewMode;
  onChange: (mode: EmployeeViewMode) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const items: Array<{ mode: EmployeeViewMode; icon: typeof LayoutGrid; label: string }> = [
    { mode: "cards", icon: LayoutGrid, label: t("views.cards") },
    { mode: "table", icon: Table2, label: t("views.table") },
    { mode: "planning", icon: List, label: t("views.planning") },
  ];

  return (
    <div className="flex rounded-lg border border-border/60 p-0.5">
      {items.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          title={label}
          onClick={() => onChange(mode)}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs transition-colors",
            viewMode === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
