"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Users,
  User,
} from "lucide-react";
import {
  markManagerThreadReadAction,
  sendManagerMessageAction,
} from "@/actions/workforce/employee-messages";
import type {
  AdminMessageRow,
  AdminMessageThreadSummary,
} from "@/lib/workforce/load-employee-messages-admin";
import type { TeamRow } from "@/lib/operations/operations-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/constants";

type ComposeMode = "employee" | "team";
type ThreadFilter = "all" | "needs_reply";

interface WorkforceMessagesViewProps {
  slug: string;
  threads: AdminMessageThreadSummary[];
  threadMessages: AdminMessageRow[];
  selectedThreadId: string | null;
  employees: Array<{ id: string; full_name: string }>;
  teams: TeamRow[];
  canWrite: boolean;
}

export function WorkforceMessagesView({
  slug,
  threads,
  threadMessages,
  selectedThreadId,
  employees,
  teams,
  canWrite,
}: WorkforceMessagesViewProps) {
  const t = useTranslations("workforce.messages");
  const router = useRouter();
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("employee");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredThreads = useMemo(() => {
    if (filter === "needs_reply") return threads.filter((th) => th.needs_reply);
    return threads;
  }, [filter, threads]);

  const selectedThread = threads.find((th) => th.thread_id === selectedThreadId) ?? null;

  function openThread(threadId: string) {
    router.push({
      pathname: ROUTES.workforceMessages(slug),
      query: { thread: threadId },
    });
    router.refresh();
  }

  function handleComposeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const fd = new FormData();
    fd.set("body", body.trim());
    if (subject.trim()) fd.set("subject", subject.trim());
    if (composeMode === "employee" && employeeId) fd.set("employeeId", employeeId);
    if (composeMode === "team" && teamId) fd.set("teamId", teamId);
    if (attachment) fd.set("attachment", attachment);

    startTransition(async () => {
      const result = await sendManagerMessageAction(slug, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("sent", { count: result.data.sent }));
      setComposeOpen(false);
      setBody("");
      setSubject("");
      setAttachment(null);
      if (result.data.threadIds[0]) {
        openThread(result.data.threadIds[0]!);
      }
    });
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThreadId || !replyBody.trim()) return;

    const fd = new FormData();
    fd.set("body", replyBody.trim());
    fd.set("threadId", selectedThreadId);
    if (replyAttachment) fd.set("attachment", replyAttachment);

    startTransition(async () => {
      const result = await sendManagerMessageAction(slug, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("replySent"));
      setReplyBody("");
      setReplyAttachment(null);
      router.refresh();
    });
  }

  function handleSelectThread(threadId: string) {
    startTransition(async () => {
      await markManagerThreadReadAction(slug, threadId);
      openThread(threadId);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              {t("compose")}
            </Button>
          ) : undefined
        }
      />

      <OperationsWorkspace className="p-0 overflow-hidden">
        <div className="flex min-h-[calc(100vh-12rem)] flex-col lg:flex-row">
          <aside className="w-full border-b lg:w-80 lg:border-b-0 lg:border-r">
            <div className="flex gap-1 border-b p-2">
              {(["all", "needs_reply"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium",
                    filter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(`filters.${key}`)}
                </button>
              ))}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto lg:max-h-none">
              {filteredThreads.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">{t("emptyThreads")}</li>
              ) : (
                filteredThreads.map((thread) => (
                  <li key={thread.thread_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectThread(thread.thread_id)}
                      className={cn(
                        "w-full border-b px-3 py-3 text-left transition-colors hover:bg-muted/40",
                        selectedThreadId === thread.thread_id && "bg-primary/5",
                        thread.needs_reply && "border-l-2 border-l-amber-500",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{thread.employee_name}</p>
                        {thread.has_unread_employee && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {thread.subject ?? t("noSubject")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{thread.last_body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {new Date(thread.last_at).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </aside>

          <section className="flex min-h-[320px] flex-1 flex-col">
            {!selectedThread ? (
              <EmptyState
                icon={MessageSquare}
                title={t("selectThreadTitle")}
                description={t("selectThreadDescription")}
                className="m-auto"
              />
            ) : (
              <>
                <header className="border-b px-4 py-3">
                  <p className="font-semibold">{selectedThread.employee_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.subject ?? t("noSubject")}
                  </p>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {threadMessages.map((msg) => (
                    <article
                      key={msg.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        msg.is_from_employee
                          ? "mr-auto bg-muted"
                          : "ml-auto bg-primary text-primary-foreground",
                      )}
                    >
                      <p className="text-[10px] font-medium opacity-80">{msg.sender_name}</p>
                      <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
                      {msg.attachment_url && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "mt-2 inline-flex items-center gap-1 text-xs underline",
                            msg.is_from_employee ? "text-primary" : "text-primary-foreground",
                          )}
                        >
                          <Paperclip className="size-3" />
                          {t("attachment")}
                        </a>
                      )}
                      <p className="mt-1 text-[10px] opacity-60">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </article>
                  ))}
                </div>

                {canWrite && (
                  <form onSubmit={handleReply} className="border-t p-4 space-y-2">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("replyPlaceholder")}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="file"
                        className="max-w-xs text-xs"
                        onChange={(e) => setReplyAttachment(e.target.files?.[0] ?? null)}
                      />
                      <Button type="submit" size="sm" disabled={pending || !replyBody.trim()}>
                        <Send className="mr-1.5 size-3.5" />
                        {t("sendReply")}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </OperationsWorkspace>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("composeTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleComposeSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={composeMode === "employee" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setComposeMode("employee")}
              >
                <User className="mr-1.5 size-3.5" />
                {t("modeEmployee")}
              </Button>
              <Button
                type="button"
                variant={composeMode === "team" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setComposeMode("team")}
              >
                <Users className="mr-1.5 size-3.5" />
                {t("modeTeam")}
              </Button>
            </div>

            {composeMode === "employee" ? (
              <div>
                <Label className="text-xs">{t("employee")}</Label>
                <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectEmployee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs">{t("team")}</Label>
                <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectTeam")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((team) => team.is_active)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">{t("subject")}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
                placeholder={t("subjectPlaceholder")}
              />
            </div>

            <div>
              <Label className="text-xs">{t("message")}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1 resize-none"
                placeholder={t("messagePlaceholder")}
              />
            </div>

            <div>
              <Label className="text-xs">{t("attachmentOptional")}</Label>
              <Input
                type="file"
                className="mt-1 text-sm"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending || !body.trim()}>
              {t("send")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
