"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Calendar, FileText, MoreHorizontal, Pencil, Smartphone, Trash2, User } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { WorkforceEmployeeHubRow } from "@/lib/workforce/employees-hub";
import { employeeName } from "@/lib/workforce/workforce-data";
import { StatusBadge } from "@/components/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  on_vacation: "info",
  absent: "warning",
  inactive: "neutral",
  terminated: "neutral",
};

const AVAILABILITY_DOT: Record<string, string> = {
  available: "bg-emerald-500",
  limited: "bg-amber-500",
  overbooked: "bg-red-500",
  unavailable: "bg-muted-foreground/40",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface EmployeeCardProps {
  slug: string;
  employee: WorkforceEmployeeHubRow;
  canWrite: boolean;
  canDelete?: boolean;
  onEdit?: (employee: WorkforceEmployeeHubRow) => void;
  onRegisterMobile?: () => void;
  onDelete?: (employee: WorkforceEmployeeHubRow) => void;
}

export function EmployeeCard({
  slug,
  employee,
  canWrite,
  canDelete = false,
  onEdit,
  onRegisterMobile,
  onDelete,
}: EmployeeCardProps) {
  const t = useTranslations("workforce.employees");
  const tRegister = useTranslations("workforce.employees.registerPwa");
  const tStatus = useTranslations("workforce.status");
  const tAvail = useTranslations("workforce.employees.availability");
  const router = useRouter();

  return (
    <article className="flex flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <Avatar className="size-11 border border-border/60">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                AVAILABILITY_DOT[employee.availability] ?? AVAILABILITY_DOT.unavailable,
              )}
              title={tAvail(employee.availability as "available")}
            />
          </div>
          <div className="min-w-0">
            <Link
              href={ROUTES.workforceEmployee(slug, employee.id)}
              className="truncate font-semibold text-foreground hover:text-primary"
            >
              {employee.full_name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {employee.job_title ?? t("noRole")}
            </p>
            {employee.teamName ? (
              <p className="truncate text-xs text-muted-foreground">{employee.teamName}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge
          status={STATUS_TONE[employee.status] ?? "neutral"}
          label={tStatus(employee.status as "active")}
          showDot
        />
      </div>

      <div className="mb-3">
        <StatusBadge
          status={employee.hasMobileAccess ? "success" : "neutral"}
          label={
            employee.hasMobileAccess ? tRegister("mobileActive") : tRegister("mobilePending")
          }
          showDot
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase tracking-wide">{t("card.supervisor")}</span>
          <span className="text-foreground">{employeeName(employee.supervisor)}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-wide">{t("columns.hours")}</span>
          <span className="text-foreground">{employee.weekly_hours ?? 40}h</span>
        </div>
      </div>

      {employee.skillNames.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1">
          {employee.skillNames.slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
        <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs">
          <Link href={ROUTES.workforceEmployee(slug, employee.id)}>
            <User className="mr-1 size-3.5" />
            {t("actions.profile")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs">
          <Link href={ROUTES.workforcePlanning(slug, { employee: employee.id })}>
            <Calendar className="mr-1 size-3.5" />
            {t("actions.plan")}
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 px-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canWrite && onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(employee)}>
                <Pencil className="mr-2 size-3.5" />
                {t("actions.edit")}
              </DropdownMenuItem>
            ) : null}
            {canWrite && onRegisterMobile ? (
              <DropdownMenuItem onClick={onRegisterMobile}>
                <Smartphone className="mr-2 size-3.5" />
                {t("actions.registerMobile")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => router.push(`${ROUTES.workforceEmployee(slug, employee.id)}?tab=documents`)}
            >
              <FileText className="mr-2 size-3.5" />
              {t("actions.documents")}
            </DropdownMenuItem>
            {canDelete && onDelete && employee.status !== "terminated" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(employee)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
