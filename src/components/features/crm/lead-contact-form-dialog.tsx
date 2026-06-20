"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createLeadContactAction } from "@/actions/crm/actions";
import { createLeadContactSchema, type CreateLeadContactInput } from "@/lib/validations/crm";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface LeadOption {
  id: string;
  company_name: string;
  contact_name: string | null;
}

interface LeadContactFormDialogProps {
  slug: string;
  /** When set, the lead is fixed (e.g. lead detail page). */
  leadId?: string;
  /** When provided without leadId, shows a lead picker. */
  leads?: LeadOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LeadContactFormDialog({
  slug,
  leadId: fixedLeadId,
  leads,
  open,
  onOpenChange,
  onSuccess,
}: LeadContactFormDialogProps) {
  const t = useTranslations("crm");
  const [pending, startTransition] = useTransition();
  const [selectedLeadId, setSelectedLeadId] = useState(fixedLeadId ?? leads?.[0]?.id ?? "");

  const activeLeadId = fixedLeadId ?? selectedLeadId;

  const form = useForm<CreateLeadContactInput>({
    resolver: zodResolver(createLeadContactSchema),
    defaultValues: {
      leadId: activeLeadId,
      name: "",
      email: "",
      phone: "",
      roleTitle: "",
      isPrimary: false,
    },
  });

  function onSubmit(values: CreateLeadContactInput) {
    if (!activeLeadId) {
      toast.error(t("contacts.selectLead"));
      return;
    }
    startTransition(async () => {
      const result = await createLeadContactAction(slug, { ...values, leadId: activeLeadId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("contacts.created"));
      form.reset({
        leadId: activeLeadId,
        name: "",
        email: "",
        phone: "",
        roleTitle: "",
        isPrimary: false,
      });
      onOpenChange(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contacts.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
            {!fixedLeadId && leads && leads.length > 0 && (
              <FormItem>
                <FormLabel>{t("contacts.selectLead")}</FormLabel>
                <select
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    form.setValue("leadId", e.target.value);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company_name}
                      {lead.contact_name ? ` · ${lead.contact_name}` : ""}
                    </option>
                  ))}
                </select>
              </FormItem>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.contactName")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contacts.role")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.email")}</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.phone")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.watch("isPrimary")}
                onChange={(e) => form.setValue("isPrimary", e.target.checked)}
              />
              {t("contacts.primary")}
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
