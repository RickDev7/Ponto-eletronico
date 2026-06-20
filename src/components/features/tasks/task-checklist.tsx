"use client";

import { useOptimistic, useTransition, useState, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/actions/checklist/actions";

interface ChecklistItem {
  id: string;
  text: string;
  is_checked: boolean;
  sort_order: number;
}

interface TaskChecklistProps {
  slug: string;
  taskId: string;
  items: ChecklistItem[];
  canEdit: boolean;
}

export function TaskChecklist({
  slug,
  taskId,
  items,
  canEdit,
}: TaskChecklistProps) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (
      state: ChecklistItem[],
      action:
        | { type: "toggle"; id: string; checked: boolean }
        | { type: "delete"; id: string }
        | { type: "add"; item: ChecklistItem },
    ) => {
      if (action.type === "toggle") {
        return state.map((i) =>
          i.id === action.id ? { ...i, is_checked: action.checked } : i,
        );
      }
      if (action.type === "delete") {
        return state.filter((i) => i.id !== action.id);
      }
      if (action.type === "add") {
        return [...state, action.item];
      }
      return state;
    },
  );

  const sorted = [...optimisticItems].sort((a, b) => a.sort_order - b.sort_order);
  const checkedCount = sorted.filter((i) => i.is_checked).length;
  const total = sorted.length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  function handleToggle(item: ChecklistItem) {
    startTransition(async () => {
      updateOptimistic({ type: "toggle", id: item.id, checked: !item.is_checked });
      const result = await toggleChecklistItem(slug, item.id, taskId, !item.is_checked);
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    setAdding(true);
    const result = await addChecklistItem(slug, taskId, newText);
    setAdding(false);
    if (result.success) {
      setNewText("");
      inputRef.current?.focus();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteChecklistItem(slug, id, taskId);
    setDeletingId(null);
    if (!result.success) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t("checklist.progress", { checked: checkedCount, total })}
          </span>
          <span className="text-xs font-semibold">{progress}%</span>
        </div>
        {total > 0 && (
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100
                  ? "bg-emerald-500"
                  : progress >= 50
                    ? "bg-primary"
                    : "bg-amber-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 group transition-colors ${
                item.is_checked ? "opacity-60" : "hover:bg-muted/40"
              }`}
            >
              <button
                onClick={() => handleToggle(item)}
                disabled={isPending}
                className={`size-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${
                  item.is_checked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-muted-foreground/40 hover:border-primary"
                }`}
                aria-label={
                  item.is_checked
                    ? t("checklist.markUndone")
                    : t("checklist.markDone")
                }
              >
                {item.is_checked && <Check className="size-3" />}
              </button>

              <span
                className={`flex-1 text-sm leading-relaxed ${
                  item.is_checked ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item.text}
              </span>

              {canEdit && (
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="opacity-0 group-hover:opacity-100 inline-flex size-5 items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  aria-label={tCommon("delete")}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") setNewText("");
            }}
            placeholder={t("checklist.newStepPlaceholder")}
            maxLength={500}
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim() || adding}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            aria-label={t("checklist.add")}
          >
            {adding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
          </button>
          {newText && (
            <button
              onClick={() => setNewText("")}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border hover:bg-muted text-muted-foreground transition-colors"
              aria-label={tCommon("cancel")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {total === 0 && !canEdit && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t("checklist.empty")}
        </p>
      )}
    </div>
  );
}
