import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { AppShellPage } from "@/components/design-system/app-shell";
import { OperationsFilterBar } from "@/components/shared";
import { TasksView } from "@/components/features/tasks/tasks-view";
import { TaskFilters } from "@/components/features/tasks/task-filters";
import { SavedFilters } from "@/components/features/tasks/saved-filters";
import { Pagination } from "@/components/ui/pagination";
import { PAGINATION } from "@/config/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks");
  return { title: t("title") };
}

const PAGE_SIZE = PAGINATION.defaultPageSize;

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    employee?: string;
    from?: string;
    to?: string;
    service?: string;
    tag?: string;
    page?: string;
  }>;
}

export default async function TasksPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, filters] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug });

  const currentPage = Math.max(1, parseInt(filters.page ?? "1", 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let tagTaskIds: string[] | null = null;

  if (filters.tag) {
    const { data: byTag } = await supabase
      .from("task_tag_assignments")
      .select("task_id")
      .eq("company_id", ctx.company.id)
      .eq("tag_id", filters.tag);
    tagTaskIds = (byTag ?? []).map((row) => row.task_id);
  }

  // ── Build filtered query ──────────────────────────────────────────────────
  let query = supabase
    .from("tasks")
    .select(
      `
      *,
      address:addresses(id, street, house_number, city, postal_code),
      assignments:task_assignments(employee_id, employee:employees(id, full_name)),
      tags:task_tag_assignments(tag:task_tags(id, name, color))
    `,
      { count: "exact" },
    )
    .eq("company_id", ctx.company.id)
    .neq("status", "cancelled");

  if (tagTaskIds) {
    if (tagTaskIds.length === 0) {
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      query = query.in("id", tagTaskIds);
    }
  }

  if (filters.q) {
    query = query.ilike("title", `%${filters.q}%`);
  }
  if (filters.status && filters.status !== "cancelled") {
    query = query.eq("status", filters.status);
  }
  if (filters.service) {
    query = query.eq("service_type", filters.service);
  }
  if (filters.from) {
    query = query.gte("scheduled_date", filters.from);
  }
  if (filters.to) {
    query = query.lte("scheduled_date", filters.to);
  }

  // Employee filter requires a join-like subquery — we handle it post-fetch for now
  // since task_assignments is a related table; for scale this can be an RPC
  const { data: tasksRaw, count } = await query
    .order("scheduled_date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Client-side filter for employee (simple, avoids extra query)
  let tasks = tasksRaw ?? [];
  if (filters.employee) {
    tasks = tasks.filter((t) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t.assignments as any[])?.some(
        (a: { employee_id: string }) => a.employee_id === filters.employee,
      ),
    );
  }

  const [{ data: addresses }, { data: employees }, { data: tags }] = await Promise.all([
    supabase
      .from("addresses")
      .select(
        "id, label, street, house_number, city, postal_code, service_types, client:clients(name)",
      )
      .eq("company_id", ctx.company.id)
      .eq("is_active", true),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("company_id", ctx.company.id)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("task_tags")
      .select("id, name, color")
      .eq("company_id", ctx.company.id)
      .order("name"),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Count active filters for badge
  const activeFilterCount = [
    filters.q,
    filters.status,
    filters.employee,
    filters.from,
    filters.to,
    filters.service,
    filters.tag,
  ].filter(Boolean).length;

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.employee) params.set("employee", filters.employee);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.service) params.set("service", filters.service);
    if (filters.tag) params.set("tag", filters.tag);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/${companySlug}/tasks${qs ? `?${qs}` : ""}`;
  }

  return (
    <AppShellPage size="fluid" className="space-y-2">
      <OperationsFilterBar>
        <Suspense fallback={null}>
          <TaskFilters
            employees={employees ?? []}
            tags={tags ?? []}
            activeFilterCount={activeFilterCount}
          />
        </Suspense>
      </OperationsFilterBar>

      <Suspense fallback={null}>
        <SavedFilters slug={companySlug} />
      </Suspense>

      <TasksView
        slug={companySlug}
        tasks={tasks}
        addresses={addresses ?? []}
        employees={employees ?? []}
        canWrite={can(ctx.membership.role, "tasks:write")}
        memberRole={ctx.membership.role}
        totalCount={count ?? 0}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        className="pt-2"
      />
    </AppShellPage>
  );
}
