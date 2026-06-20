"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { signIn } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { LOCALE_STORAGE_KEY } from "@/i18n/routing";
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
import { cn } from "@/lib/utils";

const REMEMBER_EMAIL_KEY = "feldops-remember-email";

const inputClassName = cn(
  "h-12 rounded-xl border-white/[0.08] bg-white/[0.04] px-4 text-[15px] text-white shadow-none",
  "transition-all duration-200 placeholder:text-zinc-500",
  "hover:border-white/[0.12] hover:bg-white/[0.06]",
  "focus-visible:border-white/20 focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/10",
);

export function LoginForm() {
  const router = useRouter();
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
    const result = await signIn(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      localStorage.setItem(LOCALE_STORAGE_KEY, result.data.preferredLocale);
    } catch {
      /* private mode */
    }

    document.cookie = `${LOCALE_STORAGE_KEY}=${result.data.preferredLocale};path=/;max-age=31536000;SameSite=Lax`;
    router.push(result.data.redirectTo, { locale: result.data.preferredLocale });
    router.refresh();
  }

  const isPending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[13px] font-medium text-zinc-300">
                {tForms("labels.email")}
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={tForms("placeholders.email")}
                  autoComplete="email"
                  aria-invalid={!!fieldState.error}
                  className={inputClassName}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[13px] font-medium text-zinc-300">
                {tForms("labels.password")}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="current-password"
                    aria-invalid={!!fieldState.error}
                    className={cn(inputClassName, "pr-12")}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors duration-200 hover:text-zinc-300"
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
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-0.5">
          <Link
            href="/reset"
            className="text-[13px] text-zinc-500 transition-colors duration-200 hover:text-zinc-300"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button
          type="submit"
          className={cn(
            "h-12 w-full rounded-xl bg-white text-[15px] font-medium text-zinc-950 shadow-none",
            "transition-all duration-200",
            "hover:bg-zinc-100 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]",
            "disabled:opacity-50 disabled:hover:shadow-none",
          )}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("signingIn")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </Form>
  );
}
