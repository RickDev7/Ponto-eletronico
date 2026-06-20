import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import {
  SeriesView,
  type SeriesRow,
} from "@/components/features/tasks/series-view";
import type { RecurrenceRule } from "@/lib/recurring/generator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks");
  return { title: t("series.title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function TaskSeriesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: roots } = await supabase
    .from("tasks")
    .select(`
      id, title, service_type, scheduled_date, status, recurrence_rule,
      address:addresses(street, house_number, city)
    `)
    .eq("company_id", ctx.company.id)
    .not("recurrence_rule", "is", null)
    .is("parent_task_id", null)
    .order("scheduled_date", { ascending: false });

  const rootIds = (roots ?? []).map((r) => r.id);
  const { data: instances } =
    rootIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, parent_task_id, status, scheduled_date")
          .eq("company_id", ctx.company.id)
          .in("parent_task_id", rootIds)
      : { data: [] as { id: string; parent_task_id: string; status: string; scheduled_date: string }[] };

  const today = new Date().toISOString().slice(0, 10);
  const openStatuses = new Set(["draft", "scheduled", "in_progress"]);

  const rows: SeriesRow[] = (roots ?? []).map((root) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addr = Array.isArray(root.address) ? (root.address[0] as any) : (root.address as any);
    const children = (instances ?? []).filter((i) => i.parent_task_id === root.id);
    const all = [
      { status: root.status, scheduled_date: root.scheduled_date },
      ...children.map((c) => ({ status: c.status, scheduled_date: c.scheduled_date })),
    ];
    const open = all.filter((t) => openStatuses.has(t.status));
    const completed = all.filter((t) => t.status === "completed").length;
    const futureOpen = open
      .map((t) => t.scheduled_date)
      .filter((d) => d >= today)
      .sort();
    const nextDate = futureOpen[0] ?? null;

    return {
      id: root.id,
      title: root.title,
      serviceType: root.service_type,
      startDate: root.scheduled_date,
      recurrenceRule: root.recurrence_rule as RecurrenceRule,
      addressLabel: addr
        ? `${addr.street ?? ""} ${addr.house_number ?? ""}, ${addr.city ?? ""}`.trim()
        : "",
      totalInstances: all.length,
      openInstances: open.length,
      completedInstances: completed,
      nextDate,
    };
  });

  return (
    <AppShellPage size="fluid">
      <SeriesView slug={companySlug} rows={rows} />
    </AppShellPage>
  );
}
