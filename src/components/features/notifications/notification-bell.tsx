"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bell, Check, LogIn, LogOut, MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { isNotificationTypeEnabled } from "@/lib/notifications/preference-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  check_in: LogIn,
  check_out: LogOut,
  comment: MessageSquare,
  task_assigned: RefreshCw,
};

const TYPE_COLOR: Record<string, string> = {
  check_in: "text-amber-600 bg-amber-100 dark:bg-amber-900/40",
  check_out: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
  comment: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
  task_assigned: "text-violet-600 bg-violet-100 dark:bg-violet-900/40",
};

interface NotificationBellProps {
  slug: string;
  userId: string;
}

export function NotificationBell({ slug, userId }: NotificationBellProps) {
  const t = useTranslations("notificationBell");
  const { getPreference, prefs } = useNotificationPreferences(userId);
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const notifications = useMemo(
    () => rawNotifications.filter((n) => isNotificationTypeEnabled(n.type, getPreference)),
    [rawNotifications, prefs, getPreference],
  );

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, entity_id, read_at, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRawNotifications(data ?? []);
  }

  useEffect(() => {
    load();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = notifications.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);
    setRawNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setRawNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n),
    );
  }

  async function deleteNotification(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setRawNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t("relative.justNow");
    if (m < 60) return t("relative.minutes", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("relative.hours", { count: h });
    const d = Math.floor(h / 24);
    return t("relative.days", { count: d });
  }

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DropdownMenuTrigger className="relative inline-flex size-8 items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <span className="text-sm font-semibold">
            {t("title")} {unread > 0 && `(${unread})`}
          </span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              <Check className="size-3" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto size-7 mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const colorClass = TYPE_COLOR[n.type] ?? "text-muted-foreground bg-muted";
              const isUnread = !n.read_at;
              const href = n.entity_id ? `/${slug}/tasks/${n.entity_id}` : `/${slug}`;

              return (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 px-3 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors ${isUnread ? "bg-primary/3" : ""}`}
                >
                  <div className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                    <Icon className="size-3.5" />
                  </div>

                  <Link
                    href={href}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className="flex-1 min-w-0"
                  >
                    <p className={`text-xs font-medium leading-snug ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="rounded p-1 hover:bg-muted transition-colors"
                        title={t("markRead")}
                      >
                        <Check className="size-3 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="rounded p-1 hover:bg-muted transition-colors"
                      title={t("delete")}
                    >
                      <Trash2 className="size-3 text-muted-foreground" />
                    </button>
                  </div>

                  {isUnread && (
                    <div className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
