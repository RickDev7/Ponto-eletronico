"use client";

import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { addTaskComment, deleteTaskComment } from "@/actions/comments/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

interface Comment {
  id: string;
  created_at: string;
  performed_by: string;
  metadata: { text: string; author?: string } | null;
}

interface TaskCommentsProps {
  slug: string;
  taskId: string;
  comments: Comment[];
  currentUserId: string;
}

export function TaskComments({
  slug,
  taskId,
  comments,
  currentUserId,
}: TaskCommentsProps) {
  const t = useTranslations("tasks.comments");
  const locale = useLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const result = await addTaskComment(slug, taskId, text);
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setText("");
    textareaRef.current?.focus();
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    const result = await deleteTaskComment(slug, commentId, taskId);
    setDeletingId(null);
    if (!result.success) toast.error(result.error);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    const time = d.toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (diffDays === 0) return t("todayAt", { time });
    if (diffDays === 1) return t("yesterdayAt", { time });
    return d.toLocaleString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium flex items-center gap-1.5">
        <MessageSquare className="size-4 text-muted-foreground" />
        {t("title", { count: comments.length })}
      </h2>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => {
            const isOwn = c.performed_by === currentUserId;
            const meta = c.metadata;
            const commentText = meta?.text ?? "";
            const author = meta?.author ?? t("unknownAuthor");
            const isDeleting = deletingId === c.id;

            return (
              <div
                key={c.id}
                className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0 mt-0.5">
                  {author[0]?.toUpperCase() ?? "?"}
                </div>

                <div
                  className={`group flex-1 max-w-[80%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                >
                  <div className="flex items-center gap-2">
                    {!isOwn && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {author}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(c.created_at)}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label={t("delete")}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm max-w-full break-words ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                  >
                    {commentText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          rows={2}
          placeholder={t("placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          className="resize-none flex-1"
          maxLength={1000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
          className="shrink-0 h-9 w-9"
          aria-label={t("send")}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </section>
  );
}
