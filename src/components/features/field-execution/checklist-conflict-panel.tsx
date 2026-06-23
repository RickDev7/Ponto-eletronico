"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listChecklistConflicts,
  removeChecklistTogglesForItem,
  type ChecklistConflict,
} from "@/lib/pwa/offline-queue";
import { Button } from "@/components/ui/button";

interface ChecklistConflictPanelProps {
  slug: string;
  taskId: string;
  serverItems: Array<{ id: string; text: string; is_checked: boolean }>;
  onResolved: () => void;
}

export function ChecklistConflictPanel({
  slug,
  taskId,
  serverItems,
  onResolved,
}: ChecklistConflictPanelProps) {
  const t = useTranslations("employee.mobile.checklistConflicts");
  const [conflicts, setConflicts] = useState<ChecklistConflict[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const refresh = async () => {
    const rows = await listChecklistConflicts(slug, taskId, serverItems);
    setConflicts(rows.filter((c) => !dismissedIds.has(c.itemId)));
  };

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("offline-queue-changed", onChange);
    return () => window.removeEventListener("offline-queue-changed", onChange);
  }, [slug, taskId, serverItems, dismissedIds]);

  const visible = conflicts.filter((c) => !dismissedIds.has(c.itemId));
  if (!visible.length) return null;

  function resolve(conflict: ChecklistConflict, useLocal: boolean) {
    startTransition(async () => {
      if (useLocal) {
        setDismissedIds((prev) => new Set(prev).add(conflict.itemId));
        toast.success(t("keptLocal"));
      } else {
        await removeChecklistTogglesForItem(slug, taskId, conflict.itemId);
        toast.success(t("keptServer"));
      }
      onResolved();
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" />
        {t("title", { count: visible.length })}
      </div>
      <p className="text-xs text-muted-foreground">{t("description")}</p>
      <ul className="space-y-2">
        {visible.map((conflict) => (
          <li key={conflict.itemId} className="rounded-xl border bg-card p-3">
            <p className="text-sm font-medium">{conflict.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("serverState")}: {conflict.serverChecked ? t("checked") : t("unchecked")}
              {" · "}
              {t("localState")}: {conflict.localChecked ? t("checked") : t("unchecked")}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 text-xs"
                disabled={pending}
                onClick={() => resolve(conflict, false)}
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : t("useServer")}
              </Button>
              <Button
                size="sm"
                className="h-8 flex-1 text-xs"
                disabled={pending}
                onClick={() => resolve(conflict, true)}
              >
                {t("useLocal")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
