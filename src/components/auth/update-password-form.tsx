"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { updatePassword } from "@/actions/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth.updatePassword");
  const tForms = useTranslations("forms");
  const tToasts = useTranslations("toasts");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const strengthLabels = [
    "",
    t("strength.weak"),
    t("strength.fair"),
    t("strength.strong"),
    t("strength.veryStrong"),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (strength < 2) {
      toast.error(t("passwordTooWeak"));
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.success) {
      toast.success(tToasts("passwordChanged"));
      router.push("/login");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="password">
          {t("newPassword")}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="password"
            type={show ? "text" : "password"}
            placeholder={tForms("hints.passwordMinLength")}
            className="pl-9 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < strength
                      ? strength <= 1
                        ? "bg-destructive"
                        : strength === 2
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {strengthLabels[strength]}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="confirm">
          {tForms("labels.confirmPassword")}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            placeholder={t("confirmPlaceholder")}
            className={`pl-9 ${
              confirm && confirm !== password ? "border-destructive" : ""
            }`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        {confirm && confirm !== password && (
          <p className="text-xs text-destructive">{t("passwordMismatch")}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || (confirm.length > 0 && confirm !== password)}
      >
        {loading && <Loader2 className="animate-spin" />}
        {t("submit")}
      </Button>
    </form>
  );
}

function getStrength(pw: string): number {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
