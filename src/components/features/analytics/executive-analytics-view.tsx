"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { ExecutiveDashboardData } from "@/lib/dashboard/load-executive-dashboard-data";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";
import { ExecutiveDashboardView } from "@/components/features/dashboard/executive-dashboard-view";
import { AnalyticsShell } from "@/components/features/analytics/analytics-shell";
import { AnalyticsPillarStrip } from "@/components/features/analytics/analytics-pillar-strip";
import { AppShellPage } from "@/components/design-system/layout";

interface ExecutiveAnalyticsViewProps {
  slug: string;
  pillars: AnalyticsCenterData;
  executive: ExecutiveDashboardData;
  locale: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function ExecutiveAnalyticsView({
  slug,
  pillars,
  executive,
  locale,
}: ExecutiveAnalyticsViewProps) {
  const t = useTranslations("analytics");

  return (
    <AppShellPage size="fluid">
      <AnalyticsShell
        slug={slug}
        title={t("dashboards.executive.title")}
        description={t("dashboards.executive.description")}
      >
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <AnalyticsPillarStrip
            data={pillars}
            locale={locale}
            highlight={["revenue", "profitability", "sla"]}
          />
        </motion.div>
        <div className="mt-6">
          <ExecutiveDashboardView slug={slug} data={executive} locale={locale} />
        </div>
      </AnalyticsShell>
    </AppShellPage>
  );
}
