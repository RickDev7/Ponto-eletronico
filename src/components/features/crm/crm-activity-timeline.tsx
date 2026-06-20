"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/finance/utils";
import { ROUTES } from "@/config/constants";
import type { CrmActivityEvent } from "@/lib/crm/leads-data";

const EVENT_KEYS: Record<string, string> = {
  created: "timeline.created",
  updated: "timeline.updated",
  contacted: "timeline.contacted",
  qualified: "timeline.qualified",
  quote_sent: "timeline.quoteSent",
  negotiation: "timeline.negotiation",
  won: "timeline.won",
  lost: "timeline.lost",
  client_converted: "timeline.clientConverted",
  contract_created: "timeline.contractCreated",
};

interface CrmActivityTimelineProps {
  slug: string;
  events: CrmActivityEvent[];
  locale: string;
}

export function CrmActivityTimeline({ slug, events, locale }: CrmActivityTimelineProps) {
  const t = useTranslations("crm");

  const rows = useMemo(() => events, [events]);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-4">
      {rows.map((ev) => {
        const lead = Array.isArray(ev.lead) ? ev.lead[0] : ev.lead;
        const creator = Array.isArray(ev.creator) ? ev.creator[0] : ev.creator;
        const key = EVENT_KEYS[ev.event_type];
        return (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
            <p className="text-sm font-medium">{key ? t(key) : ev.event_type}</p>
            {lead && (
              <Link
                href={ROUTES.crmLead(slug, lead.id)}
                className="text-xs text-primary hover:underline"
              >
                {lead.company_name}
              </Link>
            )}
            <p className="text-[10px] text-muted-foreground">
              {formatDate(ev.created_at.slice(0, 10), locale)}
              {creator?.full_name ? ` · ${creator.full_name}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
