"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createLeadAction, updateLeadAction } from "@/actions/crm/actions";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validations/crm";
import { composeLeadNotes, parseLeadNotesMeta } from "@/lib/crm/leads-data";
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
  FormMessage,
} from "@/components/ui/form";

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface LeadFormDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
  leadId?: string;
  initialValues?: CreateLeadInput;
  onSuccess?: (id: string) => void;
}

export function LeadFormDialog({
  slug,
  open,
  onOpenChange,
  members,
  leadId,
  initialValues,
  onSuccess,
}: LeadFormDialogProps) {
  const t = useTranslations("crm");
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(leadId);
  const parsedNotes = parseLeadNotesMeta(initialValues?.notes ?? null);
  const [intendedService, setIntendedService] = useState(parsedNotes.intendedService);
  const [leadSource, setLeadSource] = useState(parsedNotes.leadSource);

  const form = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: initialValues ?? {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      city: "",
      country: "DE",
      estimatedValueCents: 0,
      notes: parsedNotes.body,
      ownerId: members[0]?.id ?? null,
    },
  });

  function onSubmit(values: CreateLeadInput) {
    const payload = {
      ...values,
      notes: composeLeadNotes(intendedService, leadSource, values.notes ?? ""),
    };
    startTransition(async () => {
      const result = isEdit
        ? await updateLeadAction(slug, leadId!, payload)
        : await createLeadAction(slug, payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? t("toasts.updated") : t("toasts.created"));
      onOpenChange(false);
      if (!isEdit && "data" in result && result.data) onSuccess?.(result.data.id);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("leads.edit") : t("leads.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.companyName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.contactName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.owner")}</FormLabel>
                    <FormControl>
                      <select
                        suppressHydrationWarning
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name ?? m.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.website")}</FormLabel>
                    <FormControl><Input {...field} placeholder="https://" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.city")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormItem>
                <FormLabel>{t("form.intendedService")}</FormLabel>
                <Input value={intendedService} onChange={(e) => setIntendedService(e.target.value)} />
              </FormItem>
              <FormItem>
                <FormLabel>{t("form.leadSource")}</FormLabel>
                <Input value={leadSource} onChange={(e) => setLeadSource(e.target.value)} />
              </FormItem>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="estimatedValueCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.estimatedValue")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={((field.value ?? 0) / 100).toFixed(2)}
                        onChange={(e) =>
                          field.onChange(Math.round(Number(e.target.value) * 100))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={pending} className="w-full">
              {t("form.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
