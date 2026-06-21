import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { ROUTES } from "@/config/constants";
import { WorkforceAvailabilityView } from "@/components/features/workforce/workforce-availability-view";
import { loadAvailabilityOverview } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

function weekBounds(): { from: string; to: string; label: string; locale: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const from = monday.toISOString().slice(0, 10);
  const to = sunday.toISOString().slice(0, 10);
  return { from, to, label: `${from} → ${to}`, locale: "" };
}

export default async function WorkforceAvailabilityPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const { from, to } = weekBounds();
  const rows = await loadAvailabilityOverview(ctx.company.id, from, to);

  const rangeLabel = `${new Date(from + "T12:00:00").toLocaleDateString(dateLocale, { day: "numeric", month: "short" })} – ${new Date(to + "T12:00:00").toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <AppShellPage size="fluid">
      <WorkforceAvailabilityView
        slug={companySlug}
        rows={rows}
        rangeLabel={rangeLabel}
        planningHref={ROUTES.workforcePlanning(companySlug)}
      />
    </AppShellPage>
  );
}
