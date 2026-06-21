"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createEmployeeFull } from "@/actions/employees/actions";
import {
  createEmployeeFullSchema,
  type CreateEmployeeFullFormValues,
} from "@/lib/validations/employees";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeCreateDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ id: string; name: string }>;
  supervisors: Array<{ id: string; full_name: string }>;
  skills: Array<{ id: string; name: string }>;
}

export function EmployeeCreateDialog({
  slug,
  open,
  onOpenChange,
  teams,
  supervisors,
  skills,
}: EmployeeCreateDialogProps) {
  const t = useTranslations("workforce.employees.form");
  const tContract = useTranslations("workforce.profile.contractTypes");
  const router = useRouter();

  const form = useForm<CreateEmployeeFullFormValues>({
    resolver: zodResolver(createEmployeeFullSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      jobTitle: "",
      department: "",
      teamId: null,
      supervisorId: null,
      hireDate: "",
      contractType: "full_time",
      weeklyHours: 40,
      status: "active",
      accessRole: "employee",
      skillIds: [],
      sendInvite: false,
      notes: "",
    },
  });

  async function onSubmit(values: CreateEmployeeFullFormValues) {
    const result = await createEmployeeFull(slug, createEmployeeFullSchema.parse(values));
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("created"));
    onOpenChange(false);
    form.reset();
    router.refresh();
  }

  const isPending = form.formState.isSubmitting;
  const selectedSkills = form.watch("skillIds") ?? [];

  function toggleSkill(skillId: string) {
    const next = selectedSkills.includes(skillId)
      ? selectedSkills.filter((id) => id !== skillId)
      : [...selectedSkills, skillId];
    form.setValue("skillIds", next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("fullName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("department")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team")}</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("teamPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("supervisor")}</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("supervisorPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {supervisors.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("hireDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        {...field}
                        value={Number(field.value ?? 40)}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contractType")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["full_time", "part_time", "mini_job", "temporary"] as const).map((key) => (
                          <SelectItem key={key} value={key}>
                            {tContract(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accessRole")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">{t("roles.employee")}</SelectItem>
                        <SelectItem value="supervisor">{t("roles.supervisor")}</SelectItem>
                        <SelectItem value="manager">{t("roles.manager")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("status")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t("statusActive")}</SelectItem>
                        <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {skills.length > 0 ? (
                <div className="sm:col-span-2">
                  <FormLabel>{t("skills")}</FormLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={
                          selectedSkills.includes(skill.id)
                            ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs text-primary"
                            : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40"
                        }
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sendInvite"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-span-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">{t("sendInvite")}</FormLabel>
                  </FormItem>
                )}
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
