"use client";

import { useTranslations } from "next-intl";
import type { LeadStatus } from "@/lib/validations/crm";
import { StatusBadge, type StatusTone } from "@/components/shared";

const LEAD_TONES: Record<LeadStatus, StatusTone> = {
  new: "neutral",
  contacted: "info",
  qualified: "info",
  proposal_sent: "pending",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const t = useTranslations("crm.status");
  return <StatusBadge status={LEAD_TONES[status]} label={t(status)} />;
}
