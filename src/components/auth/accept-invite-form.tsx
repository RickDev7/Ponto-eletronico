"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { acceptInvite } from "@/actions/invites/actions";
import { ROUTES } from "@/config/constants";
import { sanitizeAppHref } from "@/lib/navigation/sanitize-href";
import { LegalConsent } from "@/components/marketing/legal-consent";

interface AcceptInviteFormProps {
  inviteId: string;
}

export function AcceptInviteForm({ inviteId }: AcceptInviteFormProps) {
  const router = useRouter();
  const t = useTranslations("auth.invite");
  const tConsent = useTranslations("marketing.legal.consent");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!acceptTerms) {
      setShowConsentError(true);
      return;
    }

    startTransition(async () => {
      const result = await acceptInvite(inviteId, acceptTerms);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(sanitizeAppHref(result.data.redirectTo, ROUTES.onboarding));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <LegalConsent
          id="invite-accept-terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => {
            setAcceptTerms(checked);
            if (checked) setShowConsentError(false);
          }}
          variant="register"
        />
        {showConsentError && (
          <p className="text-sm text-destructive">{tConsent("required")}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {t("submit")}
      </button>
    </div>
  );
}
