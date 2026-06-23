"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { signIn } from "@/actions/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { isInvalidAppHref } from "@/lib/navigation/sanitize-href";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const REMEMBER_EMAIL_KEY = "feldops-remember-email";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const safeRedirectParam =
    redirectParam && !isInvalidAppHref(redirectParam) ? redirectParam : null;
  const t = useTranslations("auth.login");
  const tForms = useTranslations("forms");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        form.setValue("email", saved);
        setRememberMe(true);
      }
    } catch {
      /* private mode */
    }
  }, [form]);

  async function onSubmit(values: LoginInput) {
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      /* private mode */
    }

    try {
      const result = await signIn({ ...values, redirect: safeRedirectParam });
      if (result && !result.success) {
        toast.error(result.error);
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        String((error as { digest?: string }).digest).includes("NEXT_REDIRECT")
      ) {
        return;
      }
      throw error;
    }
  }

  const isPending = form.formState.isSubmitting;
  const isMobileRedirect = safeRedirectParam?.includes("/mobile");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {isMobileRedirect ? (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            {t("mobileRedirectHint")}
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel>{tForms("labels.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={tForms("placeholders.email")}
                  autoComplete="email"
                  aria-invalid={!!fieldState.error}
                  className="h-10"
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
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel>{tForms("labels.password")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="current-password"
                    aria-invalid={!!fieldState.error}
                    className="h-10 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
            />
            <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">
              {t("rememberMe")}
            </Label>
          </div>
          <Link
            href="/reset"
            className="text-sm text-primary transition-colors hover:text-primary/80"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="h-10 w-full" loading={isPending}>
          {isPending ? t("signingIn") : t("submit")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80">
            {t("createAccount")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
