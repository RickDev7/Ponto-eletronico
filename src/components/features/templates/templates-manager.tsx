"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, FileText, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  createTemplate,
  deleteTemplate,
  type TaskTemplate,
  type TemplateChecklistItem,
} from "@/actions/templates/actions";
import { SERVICE_TYPES } from "@/types/enums";
import type { ServiceType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

function newItemId() {
  return Math.random().toString(36).slice(2);
}

interface TemplatesManagerProps {
  slug: string;
  templates: TaskTemplate[];
  canEdit: boolean;
}

export function TemplatesManager({ slug, templates, canEdit }: TemplatesManagerProps) {
  const t = useTranslations("templates");
  const tService = useTranslations("serviceTypes");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [items, setItems] = useState<TemplateChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");

  function resetForm() {
    setName("");
    setServiceType("");
    setDescription("");
    setDuration("");
    setItems([]);
    setNewItemText("");
  }

  function addItem() {
    if (!newItemText.trim()) return;
    setItems((prev) => [...prev, { id: newItemId(), text: newItemText.trim() }]);
    setNewItemText("");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSubmit() {
    if (!name.trim() || !serviceType) {
      toast.error(t("errors.nameAndServiceRequired"));
      return;
    }
    startTransition(async () => {
      const result = await createTemplate(slug, {
        name,
        service_type: serviceType,
        description: description || undefined,
        default_duration_minutes: duration ? parseInt(duration) : undefined,
        checklist_items: items,
      });
      if (result.success) {
        toast.success(t("created"));
        resetForm();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteTemplate(slug, id);
    setDeletingId(null);
    if (!result.success) toast.error(result.error);
    else toast.success(t("deleted"));
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="size-3.5" />
            {t("create")}
          </Button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
          <FileText className="mx-auto size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => {
            const isExpanded = expandedId === tpl.id;
            const checklistItems = Array.isArray(tpl.checklist_items) ? tpl.checklist_items as TemplateChecklistItem[] : [];
            return (
              <div key={tpl.id} className="rounded-xl border overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={isExpanded ? t("collapse") : t("expand")}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {tService(tpl.service_type as ServiceType)}
                      </Badge>
                      {tpl.default_duration_minutes && (
                        <span className="text-[10px] text-muted-foreground">
                          {t("minutes", { count: tpl.default_duration_minutes })}
                        </span>
                      )}
                      {checklistItems.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {t("steps", { count: checklistItems.length })}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      disabled={deletingId === tpl.id}
                      className="shrink-0 inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                      aria-label={t("delete")}
                    >
                      {deletingId === tpl.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                    {tpl.description && (
                      <p className="text-sm text-muted-foreground">{tpl.description}</p>
                    )}
                    {checklistItems.length > 0 && (
                      <ul className="space-y-1.5">
                        {checklistItems.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm">
                            <Check className="size-3.5 text-muted-foreground/50 shrink-0" />
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!tpl.description && checklistItems.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t("noDetails")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("newTemplate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("name")} *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("serviceType")} *</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("serviceTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tService(s as ServiceType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("description")}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("defaultDuration")}</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder={t("durationPlaceholder")}
                min={1}
                max={480}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("checklist")}</label>
              {items.length > 0 && (
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Check className="size-3.5 text-muted-foreground/50 shrink-0" />
                      <span className="flex-1 text-sm">{item.text}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        aria-label={t("remove")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                  placeholder={t("newStep")}
                  maxLength={500}
                  className="text-sm"
                />
                <button
                  onClick={addItem}
                  disabled={!newItemText.trim()}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-40"
                  aria-label={t("add")}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !name.trim() || !serviceType}
                className="flex-1"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : t("create")}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
