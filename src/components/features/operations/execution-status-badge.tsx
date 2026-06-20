"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared";
import type { ExecutionDisplayStatus } from "@/lib/operations/operations-data";

const TONE: Record<ExecutionDisplayStatus, "pending" | "info" | "success" | "neutral"> = {
  planned: "pending",
  in_progress: "info",
  completed: "success",
  approved: "success",
  billed: "neutral",
};

interface ExecutionStatusBadgeProps {
  status: ExecutionDisplayStatus;
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const t = useTranslations("operations.executionStatus");
  return <StatusBadge status={TONE[status]} label={t(status)} showDot />;
}
