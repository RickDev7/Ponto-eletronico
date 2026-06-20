"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  createAutomationRuleAction,
  updateAutomationRuleAction,
} from "@/actions/automations/actions";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
  CONDITION_OPERATORS,
  getActionDef,
  getTriggerDef,
} from "@/lib/automations/catalog";
import type { AutomationRuleRow } from "@/lib/automations/types";
import {
  createAutomationRuleSchema,
  type CreateAutomationRuleInput,
} from "@/lib/validations/automations";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

interface AutomationFormDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AutomationRuleRow | null;
  onSuccess?: () => void;
}

export function AutomationFormDialog({
  slug,
  open,
  onOpenChange,
  rule,
  onSuccess,
}: AutomationFormDialogProps) {
  const t = useTranslations("automations");
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(rule);

  const form = useForm<CreateAutomationRuleInput>({
    resolver: zodResolver(createAutomationRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "contract.created",
      conditions: [],
      actions: [{ type: "generate_service" }],
      isEnabled: true,
    },
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({ control: form.control, name: "conditions" });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control: form.control, name: "actions" });

  const triggerType = form.watch("triggerType");
  const triggerDef = getTriggerDef(triggerType);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description ?? "",
        triggerType: rule.trigger_type,
        conditions: rule.conditions,
        actions: rule.actions,
        isEnabled: rule.is_enabled,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        triggerType: "contract.created",
        conditions: [],
        actions: [{ type: "generate_service" }],
        isEnabled: true,
      });
    }
  }, [open, rule, form]);

  function onSubmit(values: CreateAutomationRuleInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateAutomationRuleAction(slug, rule!.id, values)
        : await createAutomationRuleAction(slug, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? t("toasts.updated") : t("toasts.created"));
      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.name")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.description")}</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.trigger")}</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {AUTOMATION_TRIGGERS.map((tr) => (
                        <option key={tr.type} value={tr.type}>
                          {t(tr.labelKey as never)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  {triggerDef && (
                    <p className="text-[11px] text-muted-foreground">
                      {t(triggerDef.descriptionKey as never)}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <FormLabel>{t("form.conditions")}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() =>
                    appendCondition({
                      field: triggerDef?.fields[0]?.key ?? "status",
                      operator: "eq",
                      value: "",
                    })
                  }
                >
                  <Plus className="size-3" /> {t("form.addCondition")}
                </Button>
              </div>

              {conditionFields.length === 0 && (
                <p className="text-[11px] text-muted-foreground">{t("form.noConditions")}</p>
              )}

              {conditionFields.map((field, index) => (
                <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <select
                    value={form.watch(`conditions.${index}.field`)}
                    onChange={(e) => form.setValue(`conditions.${index}.field`, e.target.value)}
                    className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {(triggerDef?.fields ?? [{ key: "status", labelKey: "fields.status" }]).map(
                      (f) => (
                        <option key={f.key} value={f.key}>
                          {t(f.labelKey as never)}
                        </option>
                      ),
                    )}
                  </select>
                  <select
                    value={form.watch(`conditions.${index}.operator`)}
                    onChange={(e) =>
                      form.setValue(
                        `conditions.${index}.operator`,
                        e.target.value as CreateAutomationRuleInput["conditions"][0]["operator"],
                      )
                    }
                    className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {t(op.labelKey as never)}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-8 text-xs"
                    value={String(form.watch(`conditions.${index}.value`) ?? "")}
                    onChange={(e) => form.setValue(`conditions.${index}.value`, e.target.value)}
                    placeholder={t("form.value")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <FormLabel>{t("form.actions")}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => appendAction({ type: "send_notification", channel: "in_app" })}
                >
                  <Plus className="size-3" /> {t("form.addAction")}
                </Button>
              </div>

              {actionFields.map((field, index) => {
                const actionType = form.watch(`actions.${index}.type`);
                const actionDef = getActionDef(actionType);
                return (
                  <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={actionType}
                      onChange={(e) =>
                        form.setValue(
                          `actions.${index}.type`,
                          e.target.value as CreateAutomationRuleInput["actions"][0]["type"],
                        )
                      }
                      className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {AUTOMATION_ACTIONS.map((a) => (
                        <option key={a.type} value={a.type}>
                          {t(a.labelKey as never)}
                        </option>
                      ))}
                    </select>
                    {actionDef?.channels && actionDef.channels.length > 0 ? (
                      <select
                        value={form.watch(`actions.${index}.channel`) ?? actionDef.channels[0]}
                        onChange={(e) =>
                          form.setValue(
                            `actions.${index}.channel`,
                            e.target.value as CreateAutomationRuleInput["actions"][0]["channel"],
                          )
                        }
                        className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {actionDef.channels.map((ch) => (
                          <option key={ch} value={ch}>
                            {t(`channels.${ch}` as never)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={actionFields.length <= 1}
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.watch("isEnabled")} onChange={(e) => form.setValue("isEnabled", e.target.checked)} />
              {t("form.enabled")}
            </label>

            <Button type="submit" disabled={pending} className="w-full">
              {t("form.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
