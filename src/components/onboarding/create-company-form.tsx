"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { useEffect } from "react";

import { createCompany } from "@/actions/auth";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateCompanyForm() {
  const router = useRouter();
  const t = useTranslations("auth.onboarding");
  const tForms = useTranslations("forms");
  const tToasts = useTranslations("toasts");
  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "", slug: "", legalName: "" },
  });

  const name = form.watch("name");
  useEffect(() => {
    const slug = toSlug(name);
    form.setValue("slug", slug, { shouldValidate: false });
  }, [name, form]);

  async function onSubmit(values: CreateCompanyInput) {
    const result = await createCompany(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(tToasts("companyCreated"));
    router.push(`/${values.slug}`);
    router.refresh();
  }

  const isPending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms("labels.companyName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("companyNamePlaceholder")}
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("slugLabel")}</FormLabel>
              <FormControl>
                <div className="flex items-center gap-0">
                  <span className="flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground select-none">
                    feldops.com/
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder={t("slugPlaceholder")}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription>{tForms("hints.slugFormat")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="legalName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("legalNameLabel")}{" "}
                <span className="text-muted-foreground">
                  ({tForms("placeholders.optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t("legalNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Building2 />
          )}
          {t("submit")}
        </Button>
      </form>
    </Form>
  );
}
