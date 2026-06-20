"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateEmployeeWorkforceAction } from "@/actions/workforce/actions";
import {
  updateEmployeeWorkforceSchema,
  type UpdateEmployeeWorkforceInput,
} from "@/lib/validations/workforce";
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

interface EmployeeHrFormProps {
  slug: string;
  employeeId: string;
  employee: {
    full_name: string;
    email: string | null;
    phone: string | null;
    employee_number: string | null;
    hire_date: string | null;
    notes: string | null;
    job_title: string | null;
    supervisor_id: string | null;
    contract_type: string | null;
    weekly_hours: number | null;
    status: string;
  };
  supervisors: Array<{ id: string; full_name: string }>;
  onSuccess?: () => void;
}

export function EmployeeHrForm({ slug, employeeId, employee, supervisors, onSuccess }: EmployeeHrFormProps) {
  const t = useTranslations("workforce.profile.hrForm");
  const tStatus = useTranslations("workforce.status");
  const tContract = useTranslations("workforce.profile.contractTypes");

  const form = useForm<UpdateEmployeeWorkforceInput>({
    resolver: zodResolver(updateEmployeeWorkforceSchema),
    defaultValues: {
      fullName: employee.full_name,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      employeeNumber: employee.employee_number ?? "",
      hireDate: employee.hire_date ?? "",
      notes: employee.notes ?? "",
      jobTitle: employee.job_title ?? "",
      supervisorId: employee.supervisor_id,
      contractType: (employee.contract_type as UpdateEmployeeWorkforceInput["contractType"]) ?? "full_time",
      weeklyHours: employee.weekly_hours ?? 40,
      status: employee.status as UpdateEmployeeWorkforceInput["status"],
    },
  });

  async function onSubmit(values: UpdateEmployeeWorkforceInput) {
    const result = await updateEmployeeWorkforceAction(slug, employeeId, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("saved"));
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
                <FormLabel>{t("fullName")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("jobTitle")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supervisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("supervisor")}</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">{t("noSupervisor")}</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contractType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractType")}</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(["full_time", "part_time", "mini_job", "temporary"] as const).map((type) => (
                      <option key={type} value={type}>{tContract(type)}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weeklyHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("weeklyHours")}</FormLabel>
                <FormControl>
                  <Input type="number" min={0} max={60} step={0.5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={field.value ?? "active"}
                    onChange={field.onChange}
                  >
                    {(["active", "inactive", "on_vacation", "absent"] as const).map((status) => (
                      <option key={status} value={status}>{tStatus(status)}</option>
                    ))}
                  </select>
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
                <FormLabel>{t("email")}</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("phone")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employeeNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("employeeNumber")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("hireDate")}</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("notes")}</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
