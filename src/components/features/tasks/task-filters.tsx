"use client";

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SERVICE_TYPES } from "@/types/enums";
import type { ServiceType } from "@/types";

interface Employee {
  id: string;
  full_name: string;
}

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface TaskFiltersProps {
  employees: Employee[];
  tags: TagOption[];
  activeFilterCount: number;
}

const ALL_VALUE = "__all__";

const filterTriggerClass =
  "h-7 w-full border-border/70 bg-background/50 text-[11px] shadow-none";

const TASK_STATUSES = ["draft", "scheduled", "in_progress", "completed"] as const;

export function TaskFilters({ employees, tags, activeFilterCount }: TaskFiltersProps) {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tForms = useTranslations("forms");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL_VALUE) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const employeeId = searchParams.get("employee") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const serviceType = searchParams.get("service") ?? "";
  const tagId = searchParams.get("tag") ?? "";

  return (
    <div
      className={cn(
        "transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="grid gap-1.5 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            className={cn(filterTriggerClass, "pl-7")}
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== search) {
                updateParam("q", e.target.value);
              }
            }}
          />
        </div>

        <div className="lg:col-span-2">
          <Select
            value={status || ALL_VALUE}
            onValueChange={(v) => updateParam("status", v)}
          >
            <SelectTrigger className={filterTriggerClass}>
              <SlidersHorizontal className="mr-1 size-3 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={tForms("labels.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.allStatus")}</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Select
            value={serviceType || ALL_VALUE}
            onValueChange={(v) => updateParam("service", v)}
          >
            <SelectTrigger className={filterTriggerClass}>
              <SelectValue placeholder={t("filters.service")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t("filters.allServices")}</SelectItem>
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {tServiceTypes(type as ServiceType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {employees.length > 0 && (
          <div className="lg:col-span-2">
            <Select
              value={employeeId || ALL_VALUE}
              onValueChange={(v) => updateParam("employee", v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder={t("filters.employee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("filters.allEmployees")}</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {tags.length > 0 && (
          <div className="lg:col-span-2">
            <Select
              value={tagId || ALL_VALUE}
              onValueChange={(v) => updateParam("tag", v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder={t("filters.tag")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("filters.allTags")}</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={cn("flex gap-1.5", employees.length > 0 ? "lg:col-span-4" : "lg:col-span-6")}>
          <Input
            type="date"
            className={cn(filterTriggerClass, "flex-1")}
            value={dateFrom}
            onChange={(e) => updateParam("from", e.target.value)}
            title={t("filters.dateFrom")}
          />
          <Input
            type="date"
            className={cn(filterTriggerClass, "flex-1")}
            value={dateTo}
            onChange={(e) => updateParam("to", e.target.value)}
            title={t("filters.dateTo")}
          />
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center lg:col-span-2 lg:justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <X className="size-3" />
              {t("filters.reset")}
              <span className="rounded bg-muted px-1 text-[10px] tabular-nums">
                {activeFilterCount}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
