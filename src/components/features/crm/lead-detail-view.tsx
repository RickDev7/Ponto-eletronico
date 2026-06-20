"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Plus,
  Receipt,
  ScrollText,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  isLeadReadonly,
  leadAddress,
  ownerName,
  parseLeadNotesMeta,
  type LeadListRow,
} from "@/lib/crm/leads-data";
import { LeadStatusBadge } from "@/components/features/crm/lead-status-badge";
import { LeadContactFormDialog } from "@/components/features/crm/lead-contact-form-dialog";
import { updateLeadStatusAction } from "@/actions/crm/actions";
import type { LeadStatus } from "@/lib/validations/crm";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";

interface LeadEvent {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface LeadDetailViewProps {
  slug: string;
  lead: LeadListRow;
  events: LeadEvent[];
  locale: string;
  canWrite: boolean;
}

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

export function LeadDetailView({ slug, lead, events, locale, canWrite }: LeadDetailViewProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contactOpen, setContactOpen] = useState(false);
  const readonly = isLeadReadonly(lead);
  const notesMeta = parseLeadNotesMeta(lead.notes);

  const quoteUrl = `${ROUTES.financeQuotesNew(slug)}?leadId=${lead.id}`;

  function handleMarkWon() {
    startTransition(async () => {
      const result = await updateLeadStatusAction(slug, lead.id, "won");
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toasts.converted"));
        router.refresh();
      }
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={lead.company_name}
        description={lead.contact_name ?? t("leads.noContact")}
        actions={
          <div className="flex flex-wrap gap-2">
            {canWrite && !readonly && (
              <Link
                href={quoteUrl}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <ScrollText className="size-3.5" />
                {t("actions.createQuote")}
              </Link>
            )}
            {lead.converted_client_id && (
              <>
                <Link
                  href={`${ROUTES.financeContractsNew(slug)}?clientId=${lead.converted_client_id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                >
                  <FileText className="size-3.5" />
                  {t("actions.createContract")}
                </Link>
                <Link
                  href={ROUTES.financeInvoices(slug, { create: "1", clientId: lead.converted_client_id })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                >
                  <Receipt className="size-3.5" />
                  {t("actions.generateInvoice")}
                </Link>
                <Link
                  href={ROUTES.client(slug, lead.converted_client_id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                >
                  <Building2 className="size-3.5" />
                  {t("actions.viewClient")}
                </Link>
              </>
            )}
            {canWrite && !readonly && lead.status !== "won" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={handleMarkWon}>
                {t("actions.markWon")}
              </Button>
            )}
          </div>
        }
      />

      {readonly && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          {t("leads.readonlyHint")}
        </div>
      )}

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("detail.overview")}</h3>
                <LeadStatusBadge status={lead.status as LeadStatus} />
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.contactName")}</dt>
                  <dd>{lead.contact_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.email")}</dt>
                  <dd>{lead.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.phone")}</dt>
                  <dd>{lead.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.city")}</dt>
                  <dd>{leadAddress(lead) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.website")}</dt>
                  <dd>{lead.website ?? "—"}</dd>
                </div>
                {notesMeta.intendedService && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("form.intendedService")}</dt>
                    <dd>{notesMeta.intendedService}</dd>
                  </div>
                )}
                {notesMeta.leadSource && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("form.leadSource")}</dt>
                    <dd>{notesMeta.leadSource}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">{t("form.owner")}</dt>
                  <dd>{ownerName(lead)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.value")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatMoney(lead.estimated_value_cents, "EUR", locale)}
                  </dd>
                </div>
              </dl>
              {notesMeta.body && (
                <p className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  {notesMeta.body}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("contacts.title")}</h3>
                {canWrite && !readonly && (
                  <Button size="sm" variant="outline" onClick={() => setContactOpen(true)}>
                    <Plus className="mr-1.5 size-3.5" />
                    {t("contacts.new")}
                  </Button>
                )}
              </div>
              {(!lead.contacts || lead.contacts.length === 0) ? (
                <p className="text-sm text-muted-foreground">{t("contacts.emptyHint")}</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {lead.contacts.map((c) => (
                    <li key={c.id} className="flex justify-between py-2 text-sm">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        {c.is_primary && (
                          <span className="ml-2 text-[10px] text-primary">({t("contacts.primary")})</span>
                        )}
                        <p className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.role_title ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!readonly && (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-medium text-primary">{t("automations.title")}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <ScrollText className="size-3.5" />
                    {t("automations.quote")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 className="size-3.5" />
                    {t("automations.client")}
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="size-3.5" />
                    {t("automations.contract")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Receipt className="size-3.5" />
                    {t("automations.invoice")}
                  </li>
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">{t("detail.timeline")}</h3>
            <ol className="relative space-y-4 border-l border-border/60 pl-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("detail.noEvents")}</p>
              ) : (
                events.map((ev) => {
                  const key = EVENT_KEYS[ev.event_type];
                  const creator = ev.creator;
                  const name = Array.isArray(creator) ? creator[0]?.full_name : creator?.full_name;
                  return (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{key ? t(key) : ev.event_type}</p>
                      {ev.message && (
                        <p className="text-xs text-muted-foreground">{ev.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(ev.created_at.slice(0, 10), locale)}
                        {name ? ` · ${name}` : ""}
                      </p>
                    </li>
                  );
                })
              )}
            </ol>
          </section>
        </div>
      </OperationsWorkspace>

      <LeadContactFormDialog
        slug={slug}
        leadId={lead.id}
        open={contactOpen}
        onOpenChange={setContactOpen}
        onSuccess={() => router.refresh()}
      />
    </OperationsPage>
  );
}
