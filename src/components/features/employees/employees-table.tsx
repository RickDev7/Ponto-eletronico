"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Plus, UserCheck } from "lucide-react";
import { deleteEmployee } from "@/actions/employees/actions";
import { ROUTES } from "@/config/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmployeeForm } from "./employee-form";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeStatus } from "@/types";

interface EmployeesTableProps {
  slug: string;
  employees: Employee[];
  canWrite: boolean;
}

const AVATAR_TONES = [
  "bg-primary/12 text-primary",
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  "bg-sky-500/12 text-sky-600 dark:text-sky-400",
] as const;

const EMPLOYEE_STATUS_TONES: Record<EmployeeStatus, StatusTone> = {
  active: "success",
  inactive: "neutral",
  terminated: "neutral",
  on_vacation: "info",
  absent: "warning",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function avatarTone(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) ?? 0);
  return AVATAR_TONES[code % AVATAR_TONES.length];
}

function EmployeeStatusPill({ status }: { status: EmployeeStatus }) {
  const tStatus = useTranslations("status");
  const tone = EMPLOYEE_STATUS_TONES[status] ?? EMPLOYEE_STATUS_TONES.inactive;

  return (
    <StatusBadge
      status={tone}
      label={tStatus(status)}
      showDot
      className="h-[18px] gap-1 border-0 bg-muted/40 px-1.5 py-0 text-[10px] font-medium leading-none shadow-none"
    />
  );
}

export function EmployeesTable({
  slug,
  employees,
  canWrite,
}: EmployeesTableProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tDialogs = useTranslations("dialogs.deactivateEmployee");
  const locale = useLocale();

  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const activeCount = employees.filter((e) => e.status === "active").length;

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteEmployee(slug, deleteId);
    if (!result.success) toast.error(result.error);
    else toast.success(t("toasts.deactivated"));
    setDeleteId(null);
  }

  return (
    <>
      <OperationsPage>
        <PageHeader
          title={t("title")}
          description={t("descriptionWithCount", { count: employees.length, active: activeCount })}
          compact
          actions={
            canWrite ? (
              <Button size="sm" className="h-7" onClick={() => setCreateOpen(true)}>
                <Plus />
                {t("create")}
              </Button>
            ) : undefined
          }
        />

        <OperationsWorkspace className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/80 px-2.5 py-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("sectionLabel")}
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {tCommon("entries", { count: employees.length })}
            </span>
          </div>

          {employees.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={t("empty.title")}
              description={t("empty.description")}
              size="sm"
              action={
                canWrite ? (
                  <Button size="sm" className="h-7" onClick={() => setCreateOpen(true)}>
                    <Plus />
                    {t("createFirst")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[220px]">{t("columns.employee")}</TableHead>
                  <TableHead className="hidden w-44 sm:table-cell">{t("columns.email")}</TableHead>
                  <TableHead className="hidden w-32 md:table-cell">{t("columns.phone")}</TableHead>
                  <TableHead className="hidden w-24 lg:table-cell">{t("columns.employeeNumber")}</TableHead>
                  <TableHead className="w-24">{t("columns.status")}</TableHead>
                  {canWrite && <TableHead className="w-7 px-1" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const initials = getInitials(emp.full_name);
                  const tone = avatarTone(emp.full_name);

                  return (
                    <TableRow key={emp.id} className="group border-border/50">
                      <TableCell className="max-w-0 py-1 whitespace-normal">
                        <Link
                          href={ROUTES.workforceEmployee(slug, emp.id)}
                          className="flex min-w-0 items-center gap-2 transition-colors hover:text-primary"
                        >
                          <Avatar className="size-6 shrink-0 after:border-0">
                            <AvatarFallback
                              className={cn(
                                "text-[10px] font-semibold leading-none",
                                tone,
                              )}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[12px] font-medium tracking-[-0.01em]">
                              {emp.full_name}
                            </span>
                            {(emp.employee_number || emp.hire_date) && (
                              <p className="mt-px truncate text-[10px] text-muted-foreground">
                                {emp.employee_number && (
                                  <span className="tabular-nums">#{emp.employee_number}</span>
                                )}
                                {emp.employee_number && emp.hire_date && (
                                  <span className="mx-1 text-border">·</span>
                                )}
                                {emp.hire_date &&
                                  new Date(emp.hire_date).toLocaleDateString(locale, {
                                    month: "short",
                                    year: "numeric",
                                  })}
                              </p>
                            )}
                            <p className="mt-px truncate text-[10px] text-muted-foreground sm:hidden">
                              {emp.email ?? emp.phone ?? tCommon("notAvailable")}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden py-1 sm:table-cell">
                        {emp.email ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {emp.email}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            {tCommon("notAvailable")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-1 md:table-cell">
                        {emp.phone ? (
                          <span className="block truncate text-[11px] tabular-nums text-muted-foreground">
                            {emp.phone}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            {tCommon("notAvailable")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-1 lg:table-cell">
                        {emp.employee_number ? (
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {emp.employee_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            {tCommon("notAvailable")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <EmployeeStatusPill status={emp.status} />
                      </TableCell>
                      {canWrite && (
                        <TableCell className="px-1 py-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger className={ROW_ACTION_TRIGGER_CLASS}>
                              <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem onSelect={() => setEditEmployee(emp)}>
                                <Pencil className="size-3.5" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteId(emp.id)}
                              >
                                <Trash2 className="size-3.5" />
                                {t("actions.deactivate")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </OperationsWorkspace>
      </OperationsPage>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialogs.create.title")}</DialogTitle>
          </DialogHeader>
          <EmployeeForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editEmployee}
        onOpenChange={(o) => !o && setEditEmployee(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialogs.edit.title")}</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <EmployeeForm
              slug={slug}
              employee={editEmployee}
              onSuccess={() => setEditEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDialogs("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDialogs("description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDialogs("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{tDialogs("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
