"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const tForms = useTranslations("forms");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      toast.error(result.error);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">{t("emailSentTitle")}</h3>
          <p className="text-sm text-muted-foreground">
            {t.rich("emailSentDescription", {
              email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="email">
          {t("emailLabel")}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder={tForms("placeholders.email")}
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {t("submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
