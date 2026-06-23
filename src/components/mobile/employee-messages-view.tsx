"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Paperclip,
  PenLine,
  Send,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { EmployeeMessageRow } from "@/lib/employee/load-employee-messages";
import type { EmployeeNotificationRow } from "@/lib/employee/load-employee-notifications";
import {
  markAllEmployeeMessagesReadAction,
  markEmployeeMessageReadAction,
  composeEmployeeMessageAction,
  replyEmployeeMessageAction,
  replyEmployeeMessageWithAttachmentAction,
} from "@/actions/employee/messages";
import {
  markAllEmployeeNotificationsReadAction,
  markEmployeeNotificationReadAction,
} from "@/actions/employee/notifications";
import { PushPermissionBanner } from "@/components/employee/notifications/push-permission-banner";
import { usePushSubscription } from "@/hooks/employee/use-push-subscription";
import { usePersistOfflineCache } from "@/hooks/employee/use-persist-offline-cache";
import { useOfflineCacheFallback } from "@/hooks/employee/use-offline-cache-fallback";
import { offlineCacheKey } from "@/lib/pwa/offline-cache";
import {
  enqueueOfflineAction,
  isLikelyNetworkError,
  listPendingMessageComposes,
  listPendingMessageReplies,
  registerBackgroundSync,
} from "@/lib/pwa/offline-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AppScreen,
  AppSectionTitle,
  AppSegmentTabs,
} from "@/components/mobile/app";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type InboxTab = "messages" | "alerts";

interface MessagesCachePayload {
  messages: EmployeeMessageRow[];
  notifications: EmployeeNotificationRow[];
  messagesUnread: number;
  notificationsUnread: number;
}

interface EmployeeMessagesViewProps {
  slug: string;
  employeeId: string;
  messages: EmployeeMessageRow[];
  notifications: EmployeeNotificationRow[];
  messagesUnread: number;
  notificationsUnread: number;
  initialTab?: InboxTab;
}

export function EmployeeMessagesView({
  slug,
  employeeId,
  messages: serverMessages,
  notifications: serverNotifications,
  messagesUnread: serverMessagesUnread,
  notificationsUnread: serverNotificationsUnread,
  initialTab = "messages",
}: EmployeeMessagesViewProps) {
  const t = useTranslations("employee.mobile.messages");
  const tNotif = useTranslations("employee.mobile.notifications");
  const tPwa = useTranslations("employee.mobile.pwa");

  const cacheKey = offlineCacheKey("messages", slug, employeeId);
  const serverPayload: MessagesCachePayload = {
    messages: serverMessages,
    notifications: serverNotifications,
    messagesUnread: serverMessagesUnread,
    notificationsUnread: serverNotificationsUnread,
  };
  usePersistOfflineCache(cacheKey, serverPayload);
  const cached = useOfflineCacheFallback(cacheKey, serverPayload);

  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [messages, setMessages] = useState(cached.messages);
  const [notifications, setNotifications] = useState(cached.notifications);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [pendingReplies, setPendingReplies] = useState<
    Array<{ id: string; threadId: string; body: string; createdAt: string }>
  >([]);
  const [pendingComposes, setPendingComposes] = useState<
    Array<{ id: string; body: string; subject: string | null; localThreadId: string; createdAt: string }>
  >([]);
  const push = usePushSubscription(slug);

  useEffect(() => {
    setMessages(cached.messages);
    setNotifications(cached.notifications);
  }, [cached.messages, cached.notifications]);

  const refreshPendingReplies = async () => {
    const [replies, composes] = await Promise.all([
      listPendingMessageReplies(slug),
      listPendingMessageComposes(slug),
    ]);
    setPendingReplies(replies);
    setPendingComposes(composes);
  };

  useEffect(() => {
    void refreshPendingReplies();
    const onChange = () => void refreshPendingReplies();
    window.addEventListener("offline-queue-changed", onChange);
    return () => window.removeEventListener("offline-queue-changed", onChange);
  }, [slug]);

  const tabs: { key: InboxTab; label: string; badge: number }[] = [
    { key: "messages", label: t("tabs.messages"), badge: cached.messagesUnread + pendingReplies.length + pendingComposes.length },
    { key: "alerts", label: t("tabs.alerts"), badge: cached.notificationsUnread },
  ];

  function handleMarkMessageRead(id: string) {
    startTransition(async () => {
      const result = await markEmployeeMessageReadAction(slug, id);
      if (result.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
        );
      }
    });
  }

  function handleMarkAllMessages() {
    startTransition(async () => {
      const result = await markAllEmployeeMessagesReadAction(slug);
      if (result.success) {
        setMessages((prev) => prev.map((m) => ({ ...m, read_at: m.read_at ?? new Date().toISOString() })));
        toast.success(t("markedAllRead"));
      }
    });
  }

  function handleMarkNotificationRead(id: string) {
    startTransition(async () => {
      const result = await markEmployeeNotificationReadAction(slug, id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        );
      }
    });
  }

  function handleMarkAllNotifications() {
    startTransition(async () => {
      const result = await markAllEmployeeNotificationsReadAction(slug);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
        );
        toast.success(tNotif("markAllRead"));
      }
    });
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyThreadId || !replyBody.trim()) return;

    const body = replyBody.trim();
    const threadId = replyThreadId;
    const attachment = replyAttachment;

    startTransition(async () => {
      if (!navigator.onLine) {
        if (attachment) {
          toast.error(t("attachmentOffline"));
          return;
        }
        await enqueueOfflineAction({
          type: "message_reply",
          slug,
          taskId: threadId,
          payload: { threadId, body },
        });
        await registerBackgroundSync();
        toast.success(tPwa("actionQueued"));
        setReplyBody("");
        setReplyAttachment(null);
        setReplyThreadId(null);
        await refreshPendingReplies();
        return;
      }

      try {
        let result: Awaited<ReturnType<typeof replyEmployeeMessageAction>>;
        if (attachment) {
          const fd = new FormData();
          fd.set("threadId", threadId);
          fd.set("body", body);
          fd.set("attachment", attachment);
          result = await replyEmployeeMessageWithAttachmentAction(slug, fd);
        } else {
          result = await replyEmployeeMessageAction(slug, { threadId, body });
        }
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t("replySent"));
        setReplyBody("");
        setReplyAttachment(null);
        setReplyThreadId(null);
      } catch (error) {
        if (attachment) {
          toast.error(t("replyFailed"));
          return;
        }
        if (isLikelyNetworkError(error)) {
          await enqueueOfflineAction({
            type: "message_reply",
            slug,
            taskId: threadId,
            payload: { threadId, body },
          });
          await registerBackgroundSync();
          toast.success(tPwa("actionQueued"));
          setReplyBody("");
          setReplyAttachment(null);
          setReplyThreadId(null);
          await refreshPendingReplies();
        } else {
          toast.error(t("replyFailed"));
        }
      }
    });
  }

  function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    if (!composeBody.trim()) return;

    const body = composeBody.trim();
    const subject = composeSubject.trim() || undefined;
    const localThreadId = crypto.randomUUID();

    startTransition(async () => {
      const queueCompose = async () => {
        await enqueueOfflineAction({
          type: "message_compose",
          slug,
          taskId: localThreadId,
          payload: { body, subject, localThreadId },
        });
        await registerBackgroundSync();
      };

      if (!navigator.onLine) {
        await queueCompose();
        toast.success(tPwa("actionQueued"));
        setComposeBody("");
        setComposeSubject("");
        setComposing(false);
        await refreshPendingReplies();
        return;
      }

      try {
        const result = await composeEmployeeMessageAction(slug, { body, subject, threadId: localThreadId });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t("composeSent"));
        setComposeBody("");
        setComposeSubject("");
        setComposing(false);
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          await queueCompose();
          toast.success(tPwa("actionQueued"));
          setComposeBody("");
          setComposeSubject("");
          setComposing(false);
          await refreshPendingReplies();
        } else {
          toast.error(t("composeFailed"));
        }
      }
    });
  }

  const displayMessages = [
    ...pendingComposes.map((p) => ({
      id: p.id,
      thread_id: p.localThreadId,
      subject: p.subject,
      body: p.body,
      attachment_path: null,
      read_at: new Date().toISOString(),
      created_at: p.createdAt,
      sender_employee_id: "pending",
      sender_member_id: null,
      pendingSync: true,
    })),
    ...pendingReplies.map((p) => ({
      id: p.id,
      thread_id: p.threadId,
      subject: null,
      body: p.body,
      attachment_path: null,
      read_at: new Date().toISOString(),
      created_at: p.createdAt,
      sender_employee_id: "pending",
      sender_member_id: null,
      pendingSync: true,
    })),
    ...messages.map((m) => ({ ...m, pendingSync: false })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AppScreen>
      <AppSectionTitle title={t("title")} />
      <p className="-mt-4 text-sm text-[var(--mobile-secondary)]">{t("subtitle")}</p>

      <PushPermissionBanner
        permission={push.permission}
        subscribed={push.subscribed}
        vapidConfigured={push.vapidConfigured}
        pending={pending}
        onEnable={async () => {
          const result = await push.subscribe();
          if (result.ok) toast.success(tNotif("pushEnabled"));
          return result;
        }}
      />

      <AppSegmentTabs
        value={tab}
        onChange={setTab}
        options={tabs.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.badge,
        }))}
      />

      {tab === "messages" ? (
        <>
          <div className="flex items-center justify-between gap-2">
            {cached.messagesUnread > 0 && (
              <Button variant="ghost" className="h-11 text-sm" onClick={handleMarkAllMessages} disabled={pending}>
                <Check className="size-3.5" />
                {t("markAllRead")}
              </Button>
            )}
            <Button
              variant="outline"
              className="ml-auto h-11 text-sm"
              onClick={() => {
                setComposing((v) => !v);
                setReplyThreadId(null);
              }}
            >
              <PenLine className="size-3.5" />
              {t("newMessage")}
            </Button>
          </div>

          {composing && (
            <form onSubmit={handleCompose} className="space-y-2 rounded-2xl border bg-card p-3">
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder={t("composeSubjectPlaceholder")}
                className="text-sm"
              />
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder={t("composePlaceholder")}
                rows={4}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending || !composeBody.trim()}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {t("sendMessage")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setComposing(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}

          {displayMessages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <ul className="space-y-2">
              {displayMessages.map((msg) => {
                const isPending = "pendingSync" in msg && msg.pendingSync;
                const isUnread = !isPending && !msg.read_at && !msg.sender_employee_id;
                const isOwn = Boolean(msg.sender_employee_id);
                return (
                  <li
                    key={msg.id}
                    className={cn(
                      "mobile-card p-4",
                      isUnread && "border-[var(--mobile-primary)]/30 bg-[var(--mobile-primary)]/5",
                      isPending && "border-[var(--mobile-warning)]/30 bg-[var(--mobile-warning)]/5",
                      isOwn && "ml-8 rounded-br-sm",
                      !isOwn && "mr-8 rounded-bl-sm",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {msg.subject ?? (isOwn ? t("you") : t("fromOperations"))}
                          {isPending && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-amber-700 dark:text-amber-400">
                              <Clock className="size-3" />
                              {t("pendingSync")}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{msg.body}</p>
                        {"attachment_url" in msg && msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"
                          >
                            <Paperclip className="size-3" />
                            {t("attachment")}
                          </a>
                        )}
                        <p className="mt-2 text-[10px] text-muted-foreground/70">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      {isUnread && !isPending && (
                        <button
                          type="button"
                          onClick={() => handleMarkMessageRead(msg.id)}
                          className="shrink-0 rounded-lg p-1.5 hover:bg-muted"
                          aria-label={t("markRead")}
                        >
                          <Check className="size-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {!isOwn && !isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 text-xs"
                        onClick={() => setReplyThreadId(msg.thread_id)}
                      >
                        {t("reply")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {replyThreadId && (
            <form onSubmit={handleReply} className="sticky bottom-20 space-y-2 rounded-2xl border bg-card p-3 shadow-lg">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t("replyPlaceholder")}
                rows={3}
                className="resize-none"
              />
              <Input
                type="file"
                className="text-xs"
                onChange={(e) => setReplyAttachment(e.target.files?.[0] ?? null)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending || !replyBody.trim()}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {t("sendReply")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setReplyThreadId(null)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}
        </>
      ) : (
        <>
          {cached.notificationsUnread > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleMarkAllNotifications} disabled={pending}>
              <Check className="size-3.5" />
              {tNotif("markAllRead")}
            </Button>
          )}

          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tNotif("emptyTitle")}
              description={tNotif("emptyDescription")}
            />
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => {
                const href =
                  n.entity_type === "task" && n.entity_id
                    ? ROUTES.mobileService(slug, n.entity_id)
                    : undefined;
                const isUnread = !n.read_at;
                const inner = (
                  <>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </>
                );
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-2xl border border-border/60 bg-card p-4",
                      isUnread && "border-primary/30 bg-primary/5",
                    )}
                  >
                    {href ? (
                      <Link href={href} onClick={() => isUnread && handleMarkNotificationRead(n.id)}>
                        {inner}
                      </Link>
                    ) : (
                      <div onClick={() => isUnread && handleMarkNotificationRead(n.id)}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AppScreen>
  );
}
