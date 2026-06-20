"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  ChevronRight,
  Zap,
} from "lucide-react";
import { checkIn, checkOut } from "@/actions/check-ins/actions";
import { buildMapsRouteUrl } from "@/lib/maps";
import type { ServiceType, TaskStatus } from "@/types";
import type { Employee, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/shared/kpi-card";
import { OperationsPage, OperationsWorkspace } from "@/components/shared/workspace";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<TaskStatus, { color: string; icon: React.ElementType }> = {
  draft: { color: "text-muted-foreground", icon: Clock },
  scheduled: { color: "text-blue-600", icon: Calendar },
  in_progress: { color: "text-amber-600", icon: AlertCircle },
  completed: { color: "text-emerald-600", icon: CheckCircle2 },
  cancelled: { color: "text-destructive", icon: AlertCircle },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTask = any;

interface MeViewProps {
  slug: string;
  employee: Employee;
  profile: Profile;
  todayTasks: AnyTask[];
  upcomingTasks: AnyTask[];
  openCheckIn: { id: string; check_in_at: string; task_id: string; check_in_notes: string | null } | null;
  today: string;
  todayMinutesWorked?: number;
}

export function MeView({
  slug,
  profile,
  todayTasks,
  upcomingTasks,
  openCheckIn,
  today,
  todayMinutesWorked = 0,
}: MeViewProps) {
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tToasts = useTranslations("toasts");
  const locale = useLocale();

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AnyTask | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  const completedToday = useMemo(
    () => todayTasks.filter((t) => t.status === "completed").length,
    [todayTasks],
  );

  async function handleCheckInOut(task?: AnyTask) {
    setLoading(true);

    let geo: { latitude?: number; longitude?: number } = {};
    try {
      geo = await new Promise((resolve) => {
        navigator.geolocation?.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 5000 },
        );
      });
    } catch {
      /* no GPS */
    }

    const result = openCheckIn
      ? await checkOut(slug, openCheckIn.id, { ...geo, notes: notes || undefined })
      : await checkIn(slug, (task ?? selectedTask)?.id, { ...geo, notes: notes || undefined });

    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(openCheckIn ? tToasts("checkedOut") : tToasts("checkedIn"));
    setCheckInOpen(false);
    setNotes("");
    setSelectedTask(null);
  }

  function openCheckInDialog(task: AnyTask) {
    setSelectedTask(task);
    setCheckInOpen(true);
  }

  const activeTask = openCheckIn
    ? todayTasks.find((t: AnyTask) => t.id === openCheckIn.task_id) ??
      upcomingTasks.find((t: AnyTask) => t.id === openCheckIn.task_id)
    : null;

  const hoursLabel =
    todayMinutesWorked >= 60
      ? `${Math.floor(todayMinutesWorked / 60)}h ${todayMinutesWorked % 60}m`
      : `${todayMinutesWorked}m`;

  return (
    <OperationsPage className="pb-24">
      <PageHeader
        compact
        title={tDashboard(`greeting.${greetingKey}`, { name: firstName })}
        description={new Date(`${today}T12:00:00`).toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border/50">
        <KpiCard
          variant="strip"
          label={tCommon("today")}
          value={todayTasks.length}
          className="border-0 bg-card/30 py-2"
        />
        <KpiCard
          variant="strip"
          label={tCommon("completed")}
          value={completedToday}
          className="border-0 bg-card/30 py-2"
        />
        <KpiCard
          variant="strip"
          label={tCommon("workHours")}
          value={hoursLabel}
          className="border-0 bg-card/30 py-2"
        />
      </div>

      {openCheckIn && (
        <OperationsWorkspace className="border-amber-500/30 bg-amber-500/[0.06]">
          <div className="space-y-3 p-3">
            <div className="flex items-start gap-2">
              <span className="relative mt-1.5 flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                  {tCommon("activeAssignment")}
                </p>
                {activeTask && (
                  <p className="truncate text-[11px] text-amber-700/90 dark:text-amber-400">
                    {activeTask.title}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {tCommon("since")}{" "}
                  {new Date(openCheckIn.check_in_at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 w-full bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => setCheckInOpen(true)}
            >
              <LogOut className="size-3.5" />
              {tCommon("checkOut")}
            </Button>
          </div>
        </OperationsWorkspace>
      )}

      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Zap className="size-3 text-amber-500" />
          {tCommon("today")} · {todayTasks.length}
        </div>

        {todayTasks.length === 0 ? (
          <OperationsWorkspace>
            <div className="px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-7 text-muted-foreground/30" />
              <p className="text-[12px] text-muted-foreground">{tCommon("noTasksToday")}</p>
            </div>
          </OperationsWorkspace>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task: AnyTask) => {
              const statusKey = (task.status in STATUS_ICONS ? task.status : "draft") as TaskStatus;
              const meta = STATUS_ICONS[statusKey];
              const StatusIcon = meta.icon;
              const addr = Array.isArray(task.address) ? task.address[0] : task.address;
              const client = Array.isArray(addr?.client) ? addr.client[0] : addr?.client;
              const isCurrentCheckIn = openCheckIn?.task_id === task.id;
              const canCheckIn = !openCheckIn && ["scheduled", "in_progress"].includes(task.status);
              const canCheckOut = isCurrentCheckIn;
              const mapsUrl = buildMapsRouteUrl(addr);
              const isOverdue = task.scheduled_date < today && canCheckIn;

              return (
                <OperationsWorkspace
                  key={task.id}
                  className={cn(
                    isCurrentCheckIn && "ring-1 ring-amber-500/40",
                    isOverdue && !isCurrentCheckIn && "ring-1 ring-destructive/20",
                  )}
                >
                  <div className="space-y-2.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${slug}/tasks/${task.id}`}
                          className="text-[13px] font-semibold leading-snug hover:text-primary"
                        >
                          {task.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tServiceTypes(task.service_type as ServiceType)}
                          </span>
                          <span className={cn("flex items-center gap-1 text-[10px]", meta.color)}>
                            <StatusIcon className="size-3" />
                            {tStatus(statusKey)}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-medium text-destructive">
                              {tStatus("overdue")}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.scheduled_start && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {task.scheduled_start}
                        </span>
                      )}
                    </div>

                    {addr && (
                      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="mt-0.5 size-3 shrink-0" />
                        <span>
                          {client?.name && (
                            <span className="font-medium text-foreground">{client.name} · </span>
                          )}
                          {addr.street} {addr.house_number}, {addr.postal_code} {addr.city}
                        </span>
                      </p>
                    )}

                    {addr?.access_notes && (
                      <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                        🔑 {addr.access_notes}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border/70 text-[11px] font-medium transition-colors hover:bg-muted/40"
                        >
                          <Navigation className="size-3.5" />
                          {tCommon("route")}
                        </a>
                      )}
                      {(canCheckIn || canCheckOut) && (
                        <Button
                          size="sm"
                          className={cn(
                            "h-8 flex-1 text-[11px]",
                            canCheckOut && "bg-amber-600 hover:bg-amber-700",
                          )}
                          variant={canCheckOut ? "default" : "outline"}
                          onClick={() =>
                            canCheckOut ? setCheckInOpen(true) : openCheckInDialog(task)
                          }
                        >
                          {canCheckOut ? (
                            <>
                              <LogOut className="size-3.5" /> {tCommon("checkOut")}
                            </>
                          ) : (
                            <>
                              <LogIn className="size-3.5" /> {tCommon("checkIn")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </OperationsWorkspace>
              );
            })}
          </div>
        )}
      </section>

      {upcomingTasks.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tCommon("upcomingAssignments")}
          </p>
          <OperationsWorkspace className="divide-y divide-border/50">
            {upcomingTasks.map((task: AnyTask) => {
              const addr = Array.isArray(task.address) ? task.address[0] : task.address;
              return (
                <Link
                  key={task.id}
                  href={`/${slug}/tasks/${task.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(task.scheduled_date).toLocaleDateString(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {task.scheduled_start && ` · ${task.scheduled_start}`}
                      {addr?.city && ` · ${addr.city}`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </OperationsWorkspace>
        </section>
      )}

      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{openCheckIn ? tCommon("checkOut") : tCommon("checkIn")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedTask && !openCheckIn && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{selectedTask.title}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">{tCommon("notesOptional")}</Label>
              <Textarea
                rows={3}
                placeholder={
                  openCheckIn
                    ? tCommon("checkOutNotesPlaceholder")
                    : tCommon("checkInNotesPlaceholder")
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckInOpen(false);
                setNotes("");
              }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={() => handleCheckInOut(selectedTask)}
              disabled={loading}
              className={openCheckIn ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {loading && <Loader2 className="animate-spin" />}
              {openCheckIn ? tCommon("checkOut") : tCommon("checkIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
