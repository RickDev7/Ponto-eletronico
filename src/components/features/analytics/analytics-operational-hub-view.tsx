"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";

export type OperationalInsightsTab = "metrics" | "activity" | "audits";

interface AnalyticsOperationalHubViewProps {
  slug: string;
  tab: OperationalInsightsTab;
  children: React.ReactNode;
}

export function AnalyticsOperationalHubView({ slug, tab, children }: AnalyticsOperationalHubViewProps) {
  const t = useTranslations("analytics.operational");

  const tabs: { key: OperationalInsightsTab; label: string }[] = [
    { key: "metrics", label: t("tabs.metrics") },
    { key: "activity", label: t("tabs.activity") },
    { key: "audits", label: t("tabs.audits") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={ROUTES.analyticsOperational(slug, { tab: item.key === "metrics" ? undefined : item.key })}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
