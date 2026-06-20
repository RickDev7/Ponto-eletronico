"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight } from "lucide-react";
import { CreateCompanyForm } from "@/components/onboarding/create-company-form";
import { cn } from "@/lib/utils";

const STEPS = ["welcome", "workspace"] as const;

export function OnboardingWizard() {
  const t = useTranslations("auth.onboarding.wizard");
  const [step, setStep] = useState(0);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < step
                  ? "bg-white text-zinc-950"
                  : i === step
                    ? "border border-white/20 bg-white/10 text-white"
                    : "border border-white/[0.06] text-zinc-600",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-12 transition-colors",
                  i < step ? "bg-white/40" : "bg-white/[0.08]",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">{t("welcome.title")}</h2>
            <p className="text-sm leading-relaxed text-zinc-500">{t("welcome.description")}</p>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            {t("welcome.continue")}
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-semibold text-white">{t("workspace.title")}</h2>
            <p className="text-sm text-zinc-500">{t("workspace.description")}</p>
          </div>
          <CreateCompanyForm />
        </div>
      )}
    </div>
  );
}
