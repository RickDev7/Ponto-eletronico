"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  ChevronRight,
  Clock,
  FileText,
  Mail,
  Palmtree,
  Phone,
  User,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { CompanyContext } from "@/types/database";

interface EmployeeMobileProfileViewProps {
  slug: string;
  ctx: CompanyContext;
}

const SHORTCUTS = [
  { key: "hours", href: (s: string) => ROUTES.mobileHours(s), icon: Clock },
  { key: "reports", href: (s: string) => ROUTES.mobileReports(s), icon: FileText },
  { key: "notifications", href: (s: string) => ROUTES.mobileNotifications(s), icon: Bell },
  { key: "vacations", href: (s: string) => ROUTES.mobileVacations(s), icon: Palmtree },
] as const;

export function EmployeeMobileProfileView({ slug, ctx }: EmployeeMobileProfileViewProps) {
  const t = useTranslations("employee.mobile.profile");

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {ctx.profile.full_name?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{ctx.profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{ctx.company.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.key}
            href={item.href(slug)}
            className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:bg-muted/30"
          >
            <item.icon className="size-5 text-primary" />
            <span className="text-xs font-medium leading-tight">{t(`shortcuts.${item.key}`)}</span>
          </Link>
        ))}
      </div>

      <dl className="divide-y rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("role")}</dt>
            <dd className="text-sm">{t("roleEmployee")}</dd>
          </div>
        </div>
        {ctx.profile.email && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("email")}</dt>
              <dd className="text-sm">{ctx.profile.email}</dd>
            </div>
          </div>
        )}
        {ctx.employee?.phone && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("phone")}</dt>
              <dd className="text-sm">{ctx.employee.phone}</dd>
            </div>
          </div>
        )}
        {ctx.employee?.job_title && (
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("jobTitle")}</dt>
              <dd className="text-sm">{ctx.employee.job_title}</dd>
            </div>
          </div>
        )}
      </dl>

      <Link
        href={ROUTES.mobileVacations(slug)}
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30 md:hidden"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Palmtree className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("vacations")}</p>
          <p className="text-xs text-muted-foreground">{t("vacationsHint")}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
