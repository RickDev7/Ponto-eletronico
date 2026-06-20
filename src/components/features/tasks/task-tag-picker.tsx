"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { assignTag, removeTag, createTag, deleteTag, type TaskTag } from "@/actions/tags/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#78716c",
];

interface TaskTagPickerProps {
  slug: string;
  taskId: string;
  allTags: TaskTag[];
  taskTags: TaskTag[];
  canEdit: boolean;
}

export function TaskTagPicker({ slug, taskId, allTags, taskTags, canEdit }: TaskTagPickerProps) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [creatingTag, setCreatingTag] = useState(false);
  const [, startTransition] = useTransition();

  const taskTagIds = new Set(taskTags.map((t) => t.id));

  function handleToggle(tag: TaskTag) {
    if (!canEdit) return;
    const isAssigned = taskTagIds.has(tag.id);
    startTransition(async () => {
      const result = isAssigned
        ? await removeTag(slug, taskId, tag.id)
        : await assignTag(slug, taskId, tag.id);
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    const result = await createTag(slug, newTagName, newTagColor);
    setCreatingTag(false);
    if (!result.success) {
      toast.error(result.error);
    } else {
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0]);
    }
  }

  async function handleDeleteTag(e: React.MouseEvent, tagId: string) {
    e.stopPropagation();
    const result = await deleteTag(slug, tagId);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("tagDeleted"));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {taskTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: tag.color + "22",
            color: tag.color,
            border: `1px solid ${tag.color}44`,
          }}
        >
          {tag.name}
          {canEdit && (
            <button
              onClick={() => handleToggle(tag)}
              className="hover:opacity-60 transition-opacity ml-0.5"
              aria-label={t("tags.remove")}
            >
              <X className="size-2.5" />
            </button>
          )}
        </span>
      ))}

      {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Tag className="size-2.5" />
            {t("tags.tag")}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("tags.manage")}
            </p>

            {allTags.length > 0 && (
              <div className="space-y-0.5">
                {allTags.map((tag) => {
                  const isOn = taskTagIds.has(tag.id);
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => handleToggle(tag)}
                    >
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-sm">{tag.name}</span>
                      {isOn && <Check className="size-3.5 text-primary shrink-0" />}
                      <button
                        onClick={(e) => handleDeleteTag(e, tag.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all shrink-0"
                        aria-label={tCommon("delete")}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("tags.newTag")}</p>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); }}}
                placeholder={t("tags.namePlaceholder")}
                maxLength={50}
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`size-5 rounded-full transition-transform hover:scale-110 ${
                      newTagColor === c ? "ring-2 ring-offset-1 ring-foreground scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={t("tags.color", { color: c })}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creatingTag}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
              >
                <Plus className="size-3.5" />
                {tCommon("create")}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {taskTags.length === 0 && !canEdit && (
        <span className="text-xs text-muted-foreground">{t("tags.none")}</span>
      )}
    </div>
  );
}
