"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { registerEmployeeForMobile } from "@/actions/employees/actions";
import {
  registerEmployeeMobileSchema,
  type RegisterEmployeeMobileFormValues,
} from "@/lib/validations/employees";
import type { WorkforceEmployeeHubRow } from "@/lib/workforce/employees-hub";
import { ROUTES } from "@/config/constants";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeRegisterPwaDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: WorkforceEmployeeHubRow[];
  preselectedEmployeeId?: string | null;
}

export function EmployeeRegisterPwaDialog({
  slug,
  open,
  onOpenChange,
  employees,
  preselectedEmployeeId,
}: EmployeeRegisterPwaDialogProps) {
  const t = useTranslations("workforce.employees.registerPwa");
  const tValidation = useTranslations("workforce.employees.registerPwa.validation");
  const router = useRouter();

  const eligible = useMemo(
    () => employees.filter((e) => !e.hasMobileAccess && e.status !== "terminated"),
    [employees],
  );

  const form = useForm<RegisterEmployeeMobileFormValues>({
    resolver: zodResolver(registerEmployeeMobileSchema, {
      errorMap: (issue, ctx) => {
        if (issue.message === "passwordUppercase") {
          return { message: tValidation("passwordUppercase") };
        }
        if (issue.message === "passwordNumber") {
          return { message: tValidation("passwordNumber") };
        }
        if (issue.message === "passwordMismatch") {
          return { message: tValidation("passwordMismatch") };
        }
        return { message: ctx.defaultError };
      },
    }),
    defaultValues: {
      employeeId: preselectedEmployeeId ?? "",
      email: "",
      password: "",
      confirmPassword: "",
      accessRole: "employee",
    },
  });

  const selectedEmployeeId = form.watch("employeeId");

  useEffect(() => {
    if (!open) return;
    const initialId =
      preselectedEmployeeId && eligible.some((e) => e.id === preselectedEmployeeId)
        ? preselectedEmployeeId
        : eligible[0]?.id ?? "";
    const employee = eligible.find((e) => e.id === initialId);
    form.reset({
      employeeId: initialId,
      email: employee?.email ?? "",
      password: "",
      confirmPassword: "",
      accessRole: "employee",
    });
  }, [open, preselectedEmployeeId, eligible, form]);

  useEffect(() => {
    const employee = eligible.find((e) => e.id === selectedEmployeeId);
    if (employee?.email) {
      form.setValue("email", employee.email);
    }
  }, [selectedEmployeeId, eligible, form]);

  async function onSubmit(values: RegisterEmployeeMobileFormValues) {
    const result = await registerEmployeeForMobile(
      slug,
      registerEmployeeMobileSchema.parse(values),
    );
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("success", { email: result.data.email }), {
      description: t("successHint"),
    });
    onOpenChange(false);
    form.reset();
    router.refresh();
  }

  const isPending = form.formState.isSubmitting;
  const mobilePath = ROUTES.mobile(slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEligible")}</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("employee")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("employeePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eligible.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormControl>
                      <Input type="email" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t("mobileUrlHint", { url: mobilePath })}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  {t("submit")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
