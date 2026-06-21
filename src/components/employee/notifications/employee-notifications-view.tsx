"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Check,
  Loader2,
  Palmtree,
  RefreshCw,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { EmployeeNotificationRow } from "@/lib/employee/load-employee-notifications";
import { useEmployeeNotifications } from "@/hooks/employee/use-employee-notifications";
import { usePushSubscription } from "@/hooks/employee/use-push-subscription";
import { PushPermissionBanner } from "@/components/employee/notifications/push-permission-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  task_assigned: RefreshCw,
  vacation_approved: Palmtree,
  vacation_rejected: Palmtree,
  schedule_change: CalendarDays,
};

const TYPE_COLOR: Record<string, string> = {
  task_assigned: "text-violet-600 bg-violet-100 dark:bg-violet-900/40",
  vacation_approved: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
  vacation_rejected: "text-amber-600 bg-amber-100 dark:bg-amber-900/40",
  schedule_change: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
};

interface EmployeeNotificationsViewProps {
  slug: string;
  companyId: string;
  employeeId: string;
  initialNotifications: EmployeeNotificationRow[];
  initialUnreadCount: number;
}

export function EmployeeNotificationsView({
  slug,
  companyId,
  employeeId,
  initialNotifications,
  initialUnreadCount,
}: EmployeeNotificationsViewProps) {
  const t = useTranslations("employee.mobile.notifications");
  const tBell = useTranslations("notificationBell");
  const [pushPending, startPushTransition] = useTransition();

  const push = usePushSubscription(slug);
  const { notifications, unreadCount, markRead, markAllRead } = useEmployeeNotifications({
    slug,
    companyId,
    employeeId,
    initialNotifications,
    initialUnreadCount,
  });

  function handleEnablePush() {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      startPushTransition(async () => {
        const result = await push.subscribe();
        if (result.ok) {
          toast.success(t("pushEnabled"));
          resolve({ ok: true });
        } else if (result.error === "denied") {
          toast.error(t("pushDenied"));
          resolve({ ok: false, error: result.error });
        } else if (result.error === "not_configured") {
          toast.message(t("pushNotConfigured"));
          resolve({ ok: false, error: result.error });
        } else {
          toast.error(t("pushFailed"));
          resolve({ ok: false, error: result.error });
        }
      });
    });
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return tBell("relative.justNow");
    if (m < 60) return tBell("relative.minutes", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return tBell("relative.hours", { count: h });
    const d = Math.floor(h / 24);
    return tBell("relative.days", { count: d });
  }

  function resolveHref(notification: EmployeeNotificationRow) {
    const payload = notification.payload as Record<string, string>;
    if (notification.kind === "task_assigned") {
      const taskId = payload.taskId ?? notification.entity_id;
      if (taskId) return ROUTES.mobileService(slug, taskId);
    }
    if (notification.kind.startsWith("vacation_")) {
      return ROUTES.mobileVacations(slug);
    }
    return ROUTES.mobileNotifications(slug);
  }

  return (
    <div className="flex flex-col pb-4">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{t("unreadCount", { count: unreadCount })}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void markAllRead()}>
            <Check className="size-3.5" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <PushPermissionBanner
        permission={push.permission}
        subscribed={push.subscribed}
        vapidConfigured={push.vapidConfigured}
        pending={pushPending}
        onEnable={handleEnablePush}
      />

      {push.permission === "denied" && !push.subscribed && (
        <p className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          {t("pushDeniedHint")}
        </p>
      )}

      <div className="mt-2 divide-y">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Bell className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t("emptyTitle")}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = TYPE_ICON[notification.kind] ?? Bell;
            const colorClass = TYPE_COLOR[notification.kind] ?? "text-muted-foreground bg-muted";
            const isUnread = !notification.read_at;
            const href = resolveHref(notification);

            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 transition-colors",
                  isUnread && "bg-primary/[0.03]",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                    colorClass,
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <Link
                  href={href}
                  onClick={() => {
                    if (isUnread) void markRead(notification.id);
                  }}
                  className="min-w-0 flex-1"
                >
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      isUnread ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {relativeTime(notification.created_at)}
                  </p>
                </Link>

                {isUnread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
              </div>
            );
          })
        )}
      </div>

      {pushPending && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-background/20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
