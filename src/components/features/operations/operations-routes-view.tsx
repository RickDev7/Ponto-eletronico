"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MapPin, Route } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { buildDailyRoutes, type ExecutionRow } from "@/lib/operations/operations-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Input } from "@/components/ui/input";

interface OperationsRoutesViewProps {
  slug: string;
  executions: ExecutionRow[];
  date: string;
}

export function OperationsRoutesView({ slug, executions, date }: OperationsRoutesViewProps) {
  const t = useTranslations("operations.routes");
  const routes = useMemo(() => buildDailyRoutes(executions, date), [executions, date]);

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <form method="get" className="flex items-center gap-2">
            <Input type="date" name="date" defaultValue={date} className="h-8 w-36 text-xs" />
          </form>
        }
      />

      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {t("mapsPlaceholder")}
      </div>

      <OperationsWorkspace>
        {routes.length === 0 ? (
          <EmptyState icon={Route} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="divide-y">
            {routes.map((route) => (
              <section key={route.employeeId} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{route.employeeName}</h3>
                  <span className="text-xs text-muted-foreground">
                    {t("estimated", { minutes: route.estimatedMinutes })}
                  </span>
                </div>
                <ol className="space-y-2">
                  {route.stops.map((stop) => (
                    <li key={stop.taskId} className="flex items-start gap-3 rounded-lg border p-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {stop.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={ROUTES.task(slug, stop.taskId)}
                          className="font-medium hover:text-primary"
                        >
                          {stop.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {stop.addressLabel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
