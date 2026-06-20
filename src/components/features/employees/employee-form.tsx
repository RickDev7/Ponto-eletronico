"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createEmployee, updateEmployee } from "@/actions/employees/actions";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employees";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Employee } from "@/types";

interface EmployeeFormProps {
  slug: string;
  employee?: Employee;
  onSuccess?: () => void;
}

export function EmployeeForm({ slug, employee, onSuccess }: EmployeeFormProps) {
  const t = useTranslations("employees");
  const tForms = useTranslations("forms");

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      fullName: employee?.full_name ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      employeeNumber: employee?.employee_number ?? "",
      hireDate: employee?.hire_date ?? "",
      notes: employee?.notes ?? "",
    },
  });

  async function onSubmit(values: CreateEmployeeInput) {
    const result = employee
      ? await updateEmployee(slug, employee.id, values)
      : await createEmployee(slug, values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(employee ? t("toasts.updated") : t("toasts.created"));
    onSuccess?.();
  }

  const isPending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("form.fullNameRequired")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("form.fullNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.email")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={tForms("placeholders.email")} {...field} />
                </FormControl>
                <FormMessage />
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
                  <Input placeholder={tForms("placeholders.phone")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employeeNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.employeeNumber")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("form.employeeNumberPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.hireDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("form.notes")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("form.notesPlaceholder")}
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {employee ? t("form.update") : t("form.submitCreate")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
