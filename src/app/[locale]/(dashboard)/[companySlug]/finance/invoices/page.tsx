import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { getMonthRange, monthKey, parseMonthKey } from "@/lib/finance/utils";
import { InvoicesView } from "@/components/features/finance/invoices-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ month?: string }>;
}

function prevMonthKey(key: string): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 2, 1);
  return monthKey(d);
}

export default async function FinanceInvoicesPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { month: monthParam } = await searchParams;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const month = monthParam ?? monthKey(new Date());
  const { start, end } = getMonthRange(month);
  const prevKey = prevMonthKey(month);
  const { start: prevStart, end: prevEnd } = getMonthRange(prevKey);
  const year = parseMonthKey(month).year;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [
    { data: invoices },
    { data: yearInvoices },
    { data: prevMonthInvoices },
    { data: company },
    { data: clients },
    { data: contracts },
    { data: activeContracts },
    { data: dueThisWeek },
    { data: overdueInvoices },
    { data: recentPayments },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, items:invoice_items(*), contract:contracts(title), payments:payments(method, payment_date, amount_cents)")
      .eq("company_id", ctx.company.id)
      .gte("issue_date", start)
      .lte("issue_date", end)
      .order("issue_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, status, issue_date, total_cents, amount_paid_cents, due_date")
      .eq("company_id", ctx.company.id)
      .gte("issue_date", yearStart)
      .lte("issue_date", yearEnd),
    supabase
      .from("invoices")
      .select("total_cents, status")
      .eq("company_id", ctx.company.id)
      .gte("issue_date", prevStart)
      .lte("issue_date", prevEnd)
      .in("status", ["sent", "paid", "partial", "overdue"]),
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", ctx.company.id)
      .single(),
    supabase
      .from("clients")
      .select("id, name, contact_name, email, phone")
      .eq("company_id", ctx.company.id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("contracts")
      .select("id, title, client_id, amount_cents")
      .eq("company_id", ctx.company.id)
      .eq("is_active", true)
      .order("title"),
    supabase
      .from("contracts")
      .select("amount_cents")
      .eq("company_id", ctx.company.id)
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", ctx.company.id)
      .gte("due_date", today)
      .lte("due_date", weekEnd)
      .in("status", ["sent", "partial"])
      .order("due_date")
      .limit(10),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", ctx.company.id)
      .eq("status", "overdue")
      .order("due_date")
      .limit(10),
    supabase
      .from("payments")
      .select("id, amount_cents, payment_date, method, invoice:invoices(invoice_number, client_name)")
      .eq("company_id", ctx.company.id)
      .order("payment_date", { ascending: false })
      .limit(5),
  ]);

  const previousMonthRevenueCents =
    prevMonthInvoices?.reduce((s, i) => s + (i.total_cents ?? 0), 0) ?? 0;
  const projectedRevenueCents =
    activeContracts?.reduce((s, c) => s + (c.amount_cents ?? 0), 0) ?? 0;

  return (
    <AppShellPage size="fluid">
      <InvoicesView
        slug={companySlug}
        invoices={invoices ?? []}
        yearInvoices={yearInvoices ?? []}
        month={month}
        previousMonthRevenueCents={previousMonthRevenueCents}
        projectedRevenueCents={projectedRevenueCents}
        dueThisWeek={dueThisWeek ?? []}
        overdueInvoices={overdueInvoices ?? []}
        recentPayments={recentPayments ?? []}
        clients={clients ?? []}
        contracts={contracts ?? []}
        locale={dateLocale}
        company={
          company ?? {
            name: ctx.company.name,
            legal_name: null,
            tax_id: null,
            email: null,
            phone: null,
            logo_url: null,
          }
        }
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
