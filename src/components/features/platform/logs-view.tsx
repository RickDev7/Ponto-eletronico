"use client";

import { useTranslations } from "next-intl";
import type { PlatformLogRow } from "@/types/platform";
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
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  debug: "text-muted-foreground",
  info: "text-blue-600",
  warn: "text-amber-600",
  error: "text-destructive",
};

interface LogsViewProps {
  logs: PlatformLogRow[];
}

export function LogsView({ logs }: LogsViewProps) {
  const t = useTranslations("platform.logs");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.level")}</TableHead>
              <TableHead>{t("columns.source")}</TableHead>
              <TableHead>{t("columns.message")}</TableHead>
              <TableHead>{t("columns.tenant")}</TableHead>
              <TableHead>{t("columns.time")}</TableHead>
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
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] uppercase", LEVEL_STYLES[log.level])}
                    >
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.source}</TableCell>
                  <TableCell className="max-w-md truncate text-sm">{log.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.company_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
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
