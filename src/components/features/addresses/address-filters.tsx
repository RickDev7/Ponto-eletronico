"use client";

import { useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
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

const ALL_VALUE = "__all__";

const filterTriggerClass =
  "h-7 w-full border-border/70 bg-background/50 text-[11px] shadow-none";

interface AddressFiltersProps {
  cities: string[];
  activeFilterCount: number;
  slug: string;
}

export function AddressFilters({
  cities,
  activeFilterCount,
}: AddressFiltersProps) {
  const t = useTranslations("properties");
  const tServiceTypes = useTranslations("serviceTypes");
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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const clearAll = useCallback(() => {
    if (!pathname) return;
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";
  const service = searchParams.get("service") ?? "";

  return (
    <div
      className={cn(
        "transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="grid gap-1.5 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            className={cn(filterTriggerClass, "pl-7")}
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== q) updateParam("q", e.target.value);
            }}
          />
        </div>

        {cities.length > 1 && (
          <div className="lg:col-span-3">
            <Select
              value={city || ALL_VALUE}
              onValueChange={(v) => updateParam("city", v ?? ALL_VALUE)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder={t("filters.city")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("filters.allCities")}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={cities.length > 1 ? "lg:col-span-3" : "lg:col-span-6"}>
          <Select
            value={service || ALL_VALUE}
            onValueChange={(v) => updateParam("service", v ?? ALL_VALUE)}
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

        {activeFilterCount > 0 && (
          <div className="flex items-center lg:col-span-1 lg:justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <X className="size-3" />
              <span className="hidden sm:inline">{t("filters.clear")}</span>
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
