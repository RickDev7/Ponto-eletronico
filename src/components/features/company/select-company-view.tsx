"use client";

import { Building2, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { setActiveCompany } from "@/actions/company/actions";
import { ROUTES } from "@/config/constants";
import type { MemberRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SelectCompanyItem {
  id: string;
  slug: string;
  name: string;
  role: MemberRole;
  logoUrl: string | null;
}

interface SelectCompanyViewProps {
  companies: SelectCompanyItem[];
}

export function SelectCompanyView({ companies }: SelectCompanyViewProps) {
  const t = useTranslations("selectCompany");
  const tRoles = useTranslations("roles");
  const router = useRouter();

  async function openCompany(slug: string, companyId: string) {
    await setActiveCompany(companyId);
    router.push(ROUTES.dashboard(slug));
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <ul className="space-y-2">
        {companies.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openCompany(item.slug, item.id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-sm font-semibold text-muted-foreground">
                {item.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.logoUrl}
                    alt=""
                    className="size-full rounded-lg object-cover"
                  />
                ) : (
                  item.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <Badge variant="secondary" className="mt-1 h-5 text-[10px] font-normal">
                  {tRoles(item.role)}
                </Badge>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2 border-t border-border/50 pt-4">
        <p className="text-center text-[11px] text-muted-foreground">
          {t("createHint")}
        </p>
        <Button variant="outline" size="sm" className="h-8 text-[11px]" asChild>
          <Link href={ROUTES.onboarding}>
            <Plus className="size-3.5" />
            {t("createCompany")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
