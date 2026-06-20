"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { signUp } from "@/actions/auth";
import { createRegisterSchema, type RegisterInput } from "@/lib/validations/auth";
import { LegalConsent } from "@/components/marketing/legal-consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tForms = useTranslations("forms");
  const tToasts = useTranslations("toasts");
  const tConsent = useTranslations("marketing.legal.consent");

  const registerSchema = useMemo(
    () => createRegisterSchema(tConsent("required")),
    [tConsent],
  );

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  async function onSubmit(values: RegisterInput) {
    const result = await signUp(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(tToasts("accountCreated"));
    router.push(result.data.redirectTo);
    router.refresh();
  }

  const isPending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms("labels.fullName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={tForms("placeholders.fullName")}
                  autoComplete="name"
                  {...field}
                />
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
              <FormLabel>{tForms("labels.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={tForms("placeholders.email")}
                  autoComplete="email"
                  {...field}
                />
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
              <FormLabel>{tForms("labels.password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={tForms("hints.passwordMinLength")}
                  autoComplete="new-password"
                  {...field}
                />
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
              <FormLabel>{tForms("labels.confirmPassword")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem>
              <LegalConsent
                id="register-accept-terms"
                checked={field.value}
                onCheckedChange={field.onChange}
                variant="register"
              />
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
          {isPending && <Loader2 className="animate-spin" />}
          {t("submit")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("login")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
