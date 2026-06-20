"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Ban, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { bulkUpdateTasks } from "@/actions/tasks/actions";

interface BulkActionBarProps {
  slug: string;
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionBar({ slug, selectedIds, onClear }: BulkActionBarProps) {
  const t = useTranslations("tasks");
  const tToasts = useTranslations("toasts");
  const [loading, setLoading] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  async function handleAction(action: "complete" | "cancel" | "schedule") {
    setLoading(action);
    const result = await bulkUpdateTasks(slug, selectedIds, action);
    setLoading(null);
    if (result.success) {
      toast.success(
        tToasts("bulkTasksUpdated", { count: result.data?.updated ?? selectedIds.length }),
      );
      onClear();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 lg:bottom-5">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card/95 px-2 py-1 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-r border-border pr-2">
          <span className="inline-flex size-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground tabular-nums">
            {selectedIds.length}
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {t("bulk.selected", { count: selectedIds.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleAction("complete")}
          disabled={loading !== null}
          className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
        >
          {loading === "complete" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3" />
          )}
          {t("actions.complete")}
        </button>

        <button
          type="button"
          onClick={() => handleAction("schedule")}
          disabled={loading !== null}
          className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {loading === "schedule" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Clock className="size-3" />
          )}
          {t("actions.schedule")}
        </button>

        <button
          type="button"
          onClick={() => handleAction("cancel")}
          disabled={loading !== null}
          className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          {loading === "cancel" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Ban className="size-3" />
          )}
          {t("actions.cancel")}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="ml-0.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40"
          aria-label={t("bulk.clearSelection")}
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
