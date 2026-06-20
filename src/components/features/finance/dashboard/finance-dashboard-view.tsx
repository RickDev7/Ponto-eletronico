"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Download, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import { formatMoney } from "@/lib/finance/utils";
import { openFinancePdf } from "@/lib/finance/pdf";
import type { FinanceDashboardData } from "@/lib/finance/dashboard-data";
import type { FinanceRecentInvoice } from "@/lib/finance/dashboard-data";
import { FinanceKpiCard } from "./finance-kpi-card";
import { FinanceRevenueChart } from "./finance-revenue-chart";
import { FinanceCashflowChart } from "./finance-cashflow-chart";
import { FinanceRecentInvoices } from "./finance-recent-invoices";
import { FinanceContractsPanel } from "./finance-contracts-panel";
import { FinanceForecastPanel } from "./finance-forecast-panel";
import { FinanceQuotesPanel } from "./finance-quotes-panel";
import { FinanceActivityTimeline } from "./finance-activity-timeline";
import { OperationsPage, OperationsWorkspace } from "@/components/shared";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

interface CompanyPdf {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface FinanceDashboardViewProps {
  slug: string;
  data: FinanceDashboardData;
  company: CompanyPdf;
  locale: string;
}

export function FinanceDashboardView({
  slug,
  data,
  company,
  locale,
}: FinanceDashboardViewProps) {
  const t = useTranslations("finance");
  const td = useTranslations("finance.dashboard");
  const pathname = usePathname();
  const { kpis } = data;

  function handleInvoicePdf(invoice: FinanceRecentInvoice) {
    openFinancePdf({
      type: "invoice",
      number: invoice.invoice_number,
      company: {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      },
      clientName: invoice.client_name,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      items: [],
      subtotalCents: invoice.total_cents,
      taxRate: 19,
      taxCents: 0,
      totalCents: invoice.total_cents,
      locale,
      labels: {
        quoteTitle: t("pdf.quoteTitle"),
        invoiceTitle: t("pdf.invoiceTitle"),
        from: t("pdf.from"),
        to: t("pdf.to"),
        date: t("pdf.date"),
        dueDate: t("pdf.dueDate"),
        validUntil: t("pdf.validUntil"),
        description: t("pdf.description"),
        quantity: t("pdf.quantity"),
        unitPrice: t("pdf.unitPrice"),
        total: t("pdf.total"),
        subtotal: t("pdf.subtotal"),
        tax: t("pdf.tax"),
        grandTotal: t("pdf.grandTotal"),
        notes: t("pdf.notes"),
        bankDetails: t("pdf.bankDetails"),
      },
    });
  }

  function handleExport() {
    window.open(`${pathname}/export`, "_blank");
    toast.success(td("exportStarted"));
  }

  const trendLabel =
    kpis.monthlyRevenueChangePct >= 0
      ? td("kpi.trendUp", { pct: kpis.monthlyRevenueChangePct })
      : td("kpi.trendDown", { pct: Math.abs(kpis.monthlyRevenueChangePct) });

  return (
    <OperationsPage>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.header
          variants={fadeUp}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{td("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={ROUTES.financeInvoices(slug)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted/50"
            >
              <Receipt className="size-3.5" />
              {td("actions.newInvoice")}
            </Link>
            <Link
              href={ROUTES.financeQuotesNew(slug)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              {td("actions.newQuote")}
            </Link>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted/50"
            >
              <Download className="size-3.5" />
              {td("actions.exportReport")}
            </button>
          </div>
        </motion.header>

        <OperationsWorkspace className="space-y-6">
          {/* KPI Grid */}
          <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <FinanceKpiCard
              label={t("kpis.monthlyRevenue")}
              value={formatMoney(kpis.monthlyRevenueCents, "EUR", locale)}
              trend={{
                value: trendLabel,
                positive: kpis.monthlyRevenueChangePct >= 0,
              }}
              sparkline={kpis.sparklineRevenue}
              accent="emerald"
              tooltip={td("kpi.revenueTooltip")}
            />
            <FinanceKpiCard
              label={t("kpis.projectedRevenue")}
              value={formatMoney(kpis.projectedRevenueCents, "EUR", locale)}
              sublabel={td("kpi.fromContracts")}
              accent="blue"
              tooltip={td("kpi.projectedTooltip")}
            />
            <FinanceKpiCard
              label={t("kpis.receivedThisMonth")}
              value={formatMoney(kpis.receivedRevenueCents, "EUR", locale)}
              accent="emerald"
            />
            <FinanceKpiCard
              label={t("kpis.pendingInvoices")}
              value={String(kpis.pendingInvoicesCount)}
              sublabel={formatMoney(kpis.pendingInvoicesCents, "EUR", locale)}
              accent="amber"
            />
            <FinanceKpiCard
              label={t("kpis.overdueInvoices")}
              value={String(kpis.overdueInvoicesCount)}
              sublabel={formatMoney(kpis.overdueInvoicesCents, "EUR", locale)}
              alert={kpis.overdueInvoicesCount > 0}
              accent="rose"
            />
            <FinanceKpiCard
              label={t("kpis.mrr")}
              value={formatMoney(kpis.mrrCents, "EUR", locale)}
              sublabel={td("kpi.mrrHint")}
              accent="blue"
            />
            <FinanceKpiCard
              label={t("kpis.arr")}
              value={formatMoney(kpis.arrCents, "EUR", locale)}
              sublabel={td("kpi.arrHint")}
              accent="blue"
            />
            <FinanceKpiCard
              label={t("kpis.cashflow")}
              value={formatMoney(kpis.cashflowBalanceCents, "EUR", locale)}
              sublabel={td("kpi.cashflowHint")}
              accent={kpis.cashflowBalanceCents >= 0 ? "emerald" : "rose"}
            />
          </motion.div>

          {/* Main chart + sidebar */}
          <div className="grid gap-4 lg:grid-cols-12">
            <motion.div variants={fadeUp} className="lg:col-span-8 space-y-4">
              <FinanceRevenueChart points={data.chartPoints} locale={locale} />
              <FinanceCashflowChart points={data.cashflowPoints} locale={locale} />
              <FinanceRecentInvoices
                slug={slug}
                invoices={data.recentInvoices}
                locale={locale}
                onPdf={handleInvoicePdf}
              />
            </motion.div>

            <motion.div variants={fadeUp} className="lg:col-span-4 space-y-4">
              <FinanceForecastPanel forecast={data.forecast} locale={locale} />
              <FinanceQuotesPanel slug={slug} stats={data.quoteStats} />
              <FinanceContractsPanel
                slug={slug}
                contracts={data.contracts}
                locale={locale}
              />
              <FinanceActivityTimeline items={data.activity} locale={locale} />
            </motion.div>
          </div>
        </OperationsWorkspace>
      </motion.div>
    </OperationsPage>
  );
}
