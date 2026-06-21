"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ROUTES } from "@/config/constants";
import { formatMoney } from "@/lib/finance/utils";
import {
  LEAD_KANBAN_COLUMNS,
  isLeadReadonly,
  ownerName,
  type LeadListRow,
} from "@/lib/crm/leads-data";
import { updateLeadStatusAction } from "@/actions/crm/actions";
import type { LeadStatus } from "@/lib/validations/crm";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { cn } from "@/lib/utils";

interface PipelineViewProps {
  slug: string;
  leads: LeadListRow[];
  locale: string;
  canWrite: boolean;
}

const COLUMN_ACCENT: Record<string, string> = {
  new: "border-t-blue-500",
  contacted: "border-t-violet-500",
  qualified: "border-t-indigo-500",
  proposal_sent: "border-t-amber-500",
  negotiation: "border-t-orange-500",
  won: "border-t-emerald-500",
};

export function PipelineView({ slug, leads, locale, canWrite }: PipelineViewProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo(() => {
    const map: Record<LeadStatus, LeadListRow[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal_sent: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    for (const lead of leads) {
      const status = lead.status as LeadStatus;
      if (map[status]) map[status].push(lead);
    }
    return map;
  }, [leads]);

  function handleDrop(status: LeadStatus) {
    if (!draggingId || !canWrite) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || isLeadReadonly(lead) || lead.status === status) {
      setDraggingId(null);
      setDropTarget(null);
      return;
    }

    startTransition(async () => {
      const result = await updateLeadStatusAction(slug, draggingId, status);
      if (!result.success) toast.error(result.error);
      else if (status === "won" && result.data?.clientId) {
        toast.success(t("toasts.converted"));
        router.push(ROUTES.crmLead(slug, draggingId));
      }
      setDraggingId(null);
      setDropTarget(null);
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("pipeline.title")} description={t("pipeline.description")} />

      <OperationsWorkspace>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEAD_KANBAN_COLUMNS.map((status) => (
            <motion.div
              key={status}
              layout
              className={cn(
                "min-w-[260px] flex-1 rounded-xl border border-border/60 bg-card/50 border-t-2",
                COLUMN_ACCENT[status],
                dropTarget === status && "ring-1 ring-primary/40",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget(status);
              }}
              onDragLeave={() => setDropTarget((v) => (v === status ? null : v))}
              onDrop={() => handleDrop(status)}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <p className="text-xs font-semibold tracking-wide">{t(`pipeline.columns.${status}`)}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {columns[status].length}
                </span>
              </div>
              <div className="space-y-2 p-2 min-h-[120px]">
                {columns[status].map((lead) => (
                  <div
                    key={lead.id}
                    draggable={canWrite && !isLeadReadonly(lead) && !pending}
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    onClick={() => router.push(ROUTES.crmLead(slug, lead.id))}
                    className={cn(
                      "cursor-pointer rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-primary/30",
                      draggingId === lead.id && "opacity-40",
                      isLeadReadonly(lead) && "opacity-70",
                    )}
                  >
                    <p className="text-sm font-medium leading-tight">{lead.company_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{lead.contact_name ?? "—"}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{ownerName(lead)}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatMoney(lead.estimated_value_cents, "EUR", locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
