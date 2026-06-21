"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateSupportTicketAction } from "@/actions/platform/actions";
import type { PlatformSupportTicketRow } from "@/types/platform";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SupportViewProps {
  tickets: PlatformSupportTicketRow[];
}

export function SupportView({ tickets }: SupportViewProps) {
  const t = useTranslations("platform.support");
  const [pending, startTransition] = useTransition();

  function resolve(id: string) {
    startTransition(async () => {
      const result = await updateSupportTicketAction({ ticketId: id, status: "resolved" });
      if (!result.success) toast.error(result.error);
      else toast.success(t("resolved"));
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.subject")}</TableHead>
              <TableHead>{t("columns.tenant")}</TableHead>
              <TableHead>{t("columns.priority")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.messages")}</TableHead>
              <TableHead>{t("columns.updated")}</TableHead>
              <TableHead className="text-right">{t("columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.author_name ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">{ticket.company_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>{ticket.message_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {ticket.status !== "resolved" && ticket.status !== "closed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={pending}
                        onClick={() => resolve(ticket.id)}
                      >
                        {t("actions.resolve")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
