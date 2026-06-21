"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { setActiveCompany } from "@/actions/company/actions";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";
import type { CompanyContext } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarLayout } from "@/components/design-system/layout/sidebar-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Company {
  id: string;
  name: string;
  slug: string;
}

export function CompanySwitcher({
  ctx,
  otherCompanies,
}: {
  ctx: CompanyContext;
  otherCompanies: Company[];
}) {
  const router = useRouter();
  const t = useTranslations("navigation");
  const { collapsed } = useSidebarLayout();

  async function switchCompany(slug: string, companyId: string) {
    await setActiveCompany(companyId);
    router.push(ROUTES.dashboard(slug));
  }

  const label = (
    <span
      className={cn(
        "truncate font-medium text-foreground",
        collapsed ? "sr-only" : "text-[12px]",
      )}
    >
      {ctx.company.name}
    </span>
  );

  if (otherCompanies.length === 0) {
    const content = (
      <div
        className={cn(
          "flex items-center",
          collapsed ? "size-7 justify-center" : "w-full px-2 py-1",
        )}
      >
        {!collapsed && label}
        {collapsed && (
          <span className="text-[11px] font-semibold text-muted-foreground">
            {ctx.company.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger render={content} />
          <TooltipContent side="right">{ctx.company.name}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  }

  const trigger = (
    <DropdownMenuTrigger
      className={cn(
        "flex items-center rounded-md transition-colors hover:bg-muted/60 focus-visible:outline-none",
        collapsed ? "size-7 justify-center" : "w-full gap-1.5 px-2 py-1",
      )}
    >
      {collapsed ? (
        <span className="text-[11px] font-semibold text-muted-foreground">
          {ctx.company.name[0]?.toUpperCase()}
        </span>
      ) : (
        <>
          {label}
          <ChevronsUpDown className="ml-auto size-3 shrink-0 text-muted-foreground" />
        </>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent side="right">{ctx.company.name}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t("switchCompany")}
          </DropdownMenuLabel>
          <DropdownMenuItem className="gap-2 font-medium">
            <Check className="size-3.5" />
            {ctx.company.name}
          </DropdownMenuItem>
          {otherCompanies.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => switchCompany(c.slug, c.id)}
              className="gap-2"
            >
              <Building2 className="size-3.5 text-muted-foreground" />
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push(ROUTES.selectCompany)}
          className="gap-2 text-muted-foreground"
        >
          <Building2 className="size-3.5" />
          {t("allWorkspaces")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
