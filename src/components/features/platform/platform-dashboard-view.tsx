"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Building2, CreditCard, Headphones, Users } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMoney } from "@/lib/finance/utils";
import type { PlatformDashboardStats } from "@/types/platform";
import { KpiCard, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { PLATFORM_NAV } from "@/config/platform-navigation";

interface PlatformDashboardViewProps {
  stats: PlatformDashboardStats;
  locale: string;
}

export function PlatformDashboardView({ stats, locale }: PlatformDashboardViewProps) {
  const t = useTranslations("platform");

  return (
    <OperationsPage>
      <PageHeader title={t("overview.title")} description={t("overview.description")} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label={t("kpi.totalTenants")} value={String(stats.totalTenants)} icon={Building2} />
        <KpiCard label={t("kpi.activeTenants")} value={String(stats.activeTenants)} icon={Users} />
        <KpiCard
          label={t("kpi.mrr")}
          value={formatMoney(stats.mrrCents, "EUR", locale)}
          icon={CreditCard}
        />
        <KpiCard
          label={t("kpi.trialing")}
          value={String(stats.trialingSubscriptions)}
          icon={CreditCard}
        />
        <KpiCard
          label={t("kpi.suspended")}
          value={String(stats.suspendedTenants)}
          icon={Building2}
        />
        <KpiCard
          label={t("kpi.openTickets")}
          value={String(stats.openTickets)}
          icon={Headphones}
        />
      </div>

      <OperationsWorkspace>
        <p className="mb-3 text-sm font-semibold">{t("overview.modules")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_NAV.filter((n) => n.href !== ROUTES.superAdmin).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-4 transition-shadow hover:shadow-md"
              >
                <Icon className="size-5 text-primary" />
                <span className="text-sm font-medium">
                  {t(`nav.${item.titleKey}` as never)}
                </span>
              </Link>
            );
          })}
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
