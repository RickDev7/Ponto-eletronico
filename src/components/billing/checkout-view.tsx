"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/actions/billing/actions";
import { PLANS, formatPlanPrice, resolvePlanKey } from "@/lib/billing/plans";
import { BILLING_TRIAL_DAYS } from "@/config/constants";
import { LegalConsent } from "@/components/marketing/legal-consent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckoutViewProps {
  planKey: string;
}

export function CheckoutView({ planKey }: CheckoutViewProps) {
  const t = useTranslations("billing.checkout");
  const tConsent = useTranslations("marketing.legal.consent");
  const plan = PLANS[resolvePlanKey(planKey)];
  const [pending, setPending] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  async function handleCheckout() {
    if (!acceptTerms) {
      setShowConsentError(true);
      return;
    }

    setPending(true);
    const result = await createCheckoutSession(plan.key);
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-6 backdrop-blur-xl sm:p-8",
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <div className="mb-6 space-y-1 border-b border-white/[0.06] pb-6">
        <p className="text-sm text-zinc-500">{t("selectedPlan")}</p>
        <p className="text-xl font-semibold text-white">{plan.name}</p>
        <p className="text-2xl font-semibold tracking-tight text-white">
          {formatPlanPrice(plan.priceMonthlyCents)}
          <span className="text-sm font-normal text-zinc-500"> / {t("month")}</span>
        </p>
      </div>

      <ul className="mb-6 space-y-2 text-sm text-zinc-400">
        <li>{t("trial", { days: BILLING_TRIAL_DAYS })}</li>
        <li>{t("cancelAnytime")}</li>
        <li>{t("securePayment")}</li>
      </ul>

      <div className="mb-6 space-y-2">
        <LegalConsent
          id="checkout-accept-terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => {
            setAcceptTerms(checked);
            if (checked) setShowConsentError(false);
          }}
          variant="checkout"
        />
        {showConsentError && (
          <p className="text-sm text-red-400">{tConsent("required")}</p>
        )}
      </div>

      <Button
        type="button"
        onClick={handleCheckout}
        disabled={pending}
        className="h-12 w-full rounded-xl bg-white text-zinc-950 hover:bg-zinc-100"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("processing")}
          </>
        ) : (
          t("continue")
        )}
      </Button>
    </div>
  );
}
