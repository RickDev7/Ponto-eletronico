"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth/actions";
import { Button } from "@/components/ui/button";

interface PasswordResetButtonProps {
  email: string;
}

export function PasswordResetButton({ email }: PasswordResetButtonProps) {
  const t = useTranslations("settings.security");
  const tToasts = useTranslations("toasts");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSent(true);
    toast.success(tToasts("passwordResetSent"));
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading || sent || !email}
      onClick={handleReset}
      className="h-8 text-[11px]"
    >
      {loading ? <Loader2 className="animate-spin" /> : <Lock className="size-3.5" />}
      {sent ? t("emailSent") : t("requestLink")}
    </Button>
  );
}
