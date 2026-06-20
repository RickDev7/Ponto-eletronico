"use client";

import { useTranslations } from "next-intl";
import type { QuoteStatus, InvoiceStatus, ContractStatus } from "@/lib/finance/utils";
import { StatusBadge, type StatusTone } from "@/components/shared";

const QUOTE_TONES: Record<QuoteStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  under_review: "pending",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

const INVOICE_TONES: Record<InvoiceStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  partial: "pending",
  overdue: "danger",
  cancelled: "neutral",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const t = useTranslations("finance.status.quote");
  return <StatusBadge status={QUOTE_TONES[status]} label={t(status)} />;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations("finance.status.invoice");
  return <StatusBadge status={INVOICE_TONES[status]} label={t(status)} />;
}

const CONTRACT_TONES: Record<ContractStatus, StatusTone> = {
  active: "success",
  pending: "pending",
  suspended: "neutral",
  expired: "neutral",
  cancelled: "danger",
  renewing: "info",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const t = useTranslations("finance.status.contract");
  return <StatusBadge status={CONTRACT_TONES[status]} label={t(status)} />;
}
