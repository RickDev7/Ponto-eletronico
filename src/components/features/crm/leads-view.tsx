"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ROUTES, PAGINATION } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  isLeadReadonly,
  ownerName,
  type LeadListRow,
} from "@/lib/crm/leads-data";
import { LeadStatusBadge } from "@/components/features/crm/lead-status-badge";
import { LeadFormDialog } from "@/components/features/crm/lead-form-dialog";
import { deleteLeadAction } from "@/actions/crm/actions";
import type { LeadStatus } from "@/lib/validations/crm";
import {
  EmptyState,
  OperationsFilterBar,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface LeadsViewProps {
  slug: string;
  leads: LeadListRow[];
  members: MemberOption[];
  locale: string;
  canWrite: boolean;
}

export function LeadsView({ slug, leads, members, locale, canWrite }: LeadsViewProps) {
  const t = useTranslations("crm");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [minValue, setMinValue] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return leads.filter((l) => {
      const matchesQuery =
        !query ||
        l.company_name.toLowerCase().includes(q) ||
        (l.contact_name?.toLowerCase().includes(q) ?? false) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        (l.phone?.includes(query) ?? false);

      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesOwner = ownerFilter === "all" || l.owner_id === ownerFilter;
      const matchesCity = !cityFilter || (l.city?.toLowerCase().includes(cityFilter.toLowerCase()) ?? false);
      const matchesDate = !dateFrom || l.created_at.slice(0, 10) >= dateFrom;
      const minCents = minValue ? Math.round(Number(minValue) * 100) : 0;
      const matchesValue = l.estimated_value_cents >= minCents;

      return matchesQuery && matchesStatus && matchesOwner && matchesCity && matchesDate && matchesValue;
    });
  }, [leads, query, statusFilter, ownerFilter, cityFilter, dateFrom, minValue]);

  const pageSize = PAGINATION.defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <OperationsPage>
      <PageHeader
        title={t("leads.title")}
        description={t("leads.description")}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              {t("leads.new")}
            </Button>
          ) : null
        }
      />

      <OperationsWorkspace>
        <OperationsFilterBar>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("leads.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <select
            suppressHydrationWarning
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">{t("filters.all")}</option>
            {(
              ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"] as LeadStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          <select
            suppressHydrationWarning
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">{t("form.owner")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <Input
            placeholder={t("form.city")}
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-8 w-28 text-xs"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-[130px] text-xs"
          />
          <Input
            type="number"
            placeholder="Min €"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="h-8 w-20 text-xs"
          />
        </OperationsFilterBar>

        {filtered.length === 0 ? (
          <EmptyState title={t("leads.empty")} description={t("leads.emptyHint")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.company")}</TableHead>
                  <TableHead>{t("columns.contact")}</TableHead>
                  <TableHead>{t("form.email")}</TableHead>
                  <TableHead>{t("form.city")}</TableHead>
                  <TableHead className="text-right">{t("columns.value")}</TableHead>
                  <TableHead>{t("form.owner")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.created")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((lead) => (
                  <TableRow key={lead.id} className={isLeadReadonly(lead) ? "opacity-70" : undefined}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell>{lead.contact_name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{lead.city ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(lead.estimated_value_cents, "EUR", locale)}
                    </TableCell>
                    <TableCell className="text-xs">{ownerName(lead)}</TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status as LeadStatus} />
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(lead.created_at.slice(0, 10), locale)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(ROUTES.crmLead(slug, lead.id))}>
                            <Eye className="size-3.5" />
                            {t("actions.view")}
                          </DropdownMenuItem>
                          {canWrite && !isLeadReadonly(lead) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await deleteLeadAction(slug, lead.id);
                                  if (!r.success) toast.error(r.error);
                                  else toast.success(t("toasts.deleted"));
                                })
                              }
                            >
                              <Trash2 className="size-3.5" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OperationsWorkspace>

      {canWrite && (
        <LeadFormDialog
          slug={slug}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          members={members}
          onSuccess={(id) => router.push(ROUTES.crmLead(slug, id))}
        />
      )}
    </OperationsPage>
  );
}
