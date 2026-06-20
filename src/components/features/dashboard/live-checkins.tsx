"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Card, CardContent, CardHeader, SectionHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface LiveCheckIn {
  id: string;
  check_in_at: string;
  task_id: string;
  task_title: string;
  employee_name: string;
}

interface LiveCheckInsProps {
  slug: string;
  companyId: string;
  initialCheckIns: LiveCheckIn[];
  variant?: "card" | "embedded";
}

function elapsed(from: string) {
  const diff = Date.now() - new Date(from).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function CheckInRows({
  checkIns,
  slug,
  tick,
  compact = false,
}: {
  checkIns: LiveCheckIn[];
  slug: string;
  tick: number;
  compact?: boolean;
}) {
  return (
    <>
      {checkIns.map((ci) => (
        <div
          key={ci.id}
          className={cn(
            "flex items-center gap-2 transition-colors hover:bg-muted/30",
            compact ? "px-2.5 py-1" : "gap-3 px-4 py-3",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400",
              compact ? "size-6 text-[10px]" : "size-8 text-xs",
            )}
          >
            {(ci.employee_name ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium leading-tight", compact ? "text-[12px]" : "text-sm")}>
              {ci.employee_name}
            </p>
            <Link
              href={`/${slug}/tasks/${ci.task_id}`}
              className={cn(
                "block truncate text-muted-foreground transition-colors hover:text-foreground",
                compact ? "text-[11px]" : "text-xs hover:underline underline-offset-2",
              )}
            >
              {ci.task_title}
            </Link>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-400",
              compact ? "h-5 gap-0.5 px-1.5 text-[10px]" : "flex items-center gap-1 text-xs",
            )}
          >
            <Clock className={compact ? "size-2.5" : "size-3"} />
            {elapsed(ci.check_in_at)}
            <span className="sr-only">{tick}</span>
          </Badge>
        </div>
      ))}
    </>
  );
}

export function LiveCheckIns({
  slug,
  companyId,
  initialCheckIns,
  variant = "card",
}: LiveCheckInsProps) {
  const [checkIns, setCheckIns] = useState<LiveCheckIn[]>(initialCheckIns);
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`checkins:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "check_ins",
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("check_ins")
            .select(`
              id, check_in_at, task_id,
              task:tasks(title),
              employee:employees(full_name)
            `)
            .eq("company_id", companyId)
            .is("check_out_at", null)
            .order("check_in_at", { ascending: false });

          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCheckIns(data.map((ci: any) => ({
              id: ci.id,
              check_in_at: ci.check_in_at,
              task_id: ci.task_id,
              task_title: (Array.isArray(ci.task) ? ci.task[0] : ci.task)?.title ?? "—",
              employee_name: (Array.isArray(ci.employee) ? ci.employee[0] : ci.employee)?.full_name ?? "—",
            })));
          }

          void payload;
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  if (checkIns.length === 0) return null;

  if (variant === "embedded") {
    return (
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-border bg-amber-500/[0.06] px-2.5 py-1">
          <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Live · {checkIns.length} im Einsatz
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            {connected ? (
              <>
                <Wifi className="size-2.5 text-emerald-500" /> Sync
              </>
            ) : (
              <>
                <WifiOff className="size-2.5" /> Offline
              </>
            )}
          </span>
        </div>
        <div className="divide-y divide-border">
          <CheckInRows checkIns={checkIns} slug={slug} tick={tick} compact />
        </div>
      </div>
    );
  }

  return (
    <Card
      variant="outline"
      className="overflow-hidden border-amber-500/25 shadow-none"
    >
      <CardHeader className="border-b border-amber-500/20 bg-amber-500/[0.06] py-2">
        <SectionHeader
          title={
            <span className="flex items-center gap-2 text-[12px] font-medium text-amber-800 dark:text-amber-300">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              Live — {checkIns.length} aktiv
            </span>
          }
          actions={
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {connected ? (
                <>
                  <Wifi className="size-3 text-emerald-500" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="size-3" /> Offline
                </>
              )}
            </div>
          }
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          <CheckInRows checkIns={checkIns} slug={slug} tick={tick} />
        </div>
      </CardContent>
    </Card>
  );
}
