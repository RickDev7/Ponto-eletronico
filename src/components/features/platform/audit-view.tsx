"use client";

import { useTranslations } from "next-intl";
import type { PlatformAuditRow } from "@/types/platform";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditViewProps {
  logs: PlatformAuditRow[];
}

export function AuditView({ logs }: AuditViewProps) {
  const t = useTranslations("platform.audit");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.time")}</TableHead>
              <TableHead>{t("columns.actor")}</TableHead>
              <TableHead>{t("columns.action")}</TableHead>
              <TableHead>{t("columns.target")}</TableHead>
              <TableHead>{t("columns.tenant")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{log.actor_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="text-muted-foreground">{log.target_type}</span>
                    {log.target_id && (
                      <span className="ml-1 font-mono">{log.target_id.slice(0, 8)}…</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{log.company_name ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
