"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, LineChart, PieChart } from "lucide-react";

interface AnalyticsShellProps {
  slug: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const TABS = [
  { key: "hub", href: (s: string) => ROUTES.analytics(s), icon: BarChart3 },
  { key: "executive", href: (s: string) => ROUTES.analyticsExecutive(s), icon: PieChart },
  { key: "operational", href: (s: string) => ROUTES.analyticsOperational(s), icon: Briefcase },
  { key: "financial", href: (s: string) => ROUTES.analyticsFinancial(s), icon: LineChart },
] as const;

export function AnalyticsShell({ slug, children, title, description }: AnalyticsShellProps) {
  const t = useTranslations("analytics");
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title ?? t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description ?? t("description")}</p>
      </div>

      <nav className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
        {TABS.map((tab) => {
          const href = tab.href(slug);
          const active = pathname === href || (tab.key === "hub" && pathname === ROUTES.analytics(slug));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t(`tabs.${tab.key}`)}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
