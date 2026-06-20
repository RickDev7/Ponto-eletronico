"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const ACCEPT_TERMS_ERROR_KEY = "acceptTermsRequired";

interface LegalConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: "register" | "checkout";
  id?: string;
  className?: string;
}

function legalLinkClass(variant: "register" | "checkout") {
  return variant === "checkout"
    ? "font-medium text-zinc-200 underline-offset-2 hover:text-white hover:underline"
    : "font-medium text-primary underline-offset-2 hover:underline";
}

export function LegalConsent({
  checked,
  onCheckedChange,
  variant = "register",
  id = "legal-consent",
  className,
}: LegalConsentProps) {
  const t = useTranslations("marketing.legal.consent");
  const linkClass = legalLinkClass(variant);

  const richTags = {
    terms: (chunks: ReactNode) => (
      <Link href={ROUTES.terms} className={linkClass} target="_blank">
        {chunks}
      </Link>
    ),
    privacy: (chunks: ReactNode) => (
      <Link href={ROUTES.privacy} className={linkClass} target="_blank">
        {chunks}
      </Link>
    ),
    cookies: (chunks: ReactNode) => (
      <Link href={ROUTES.cookies} className={linkClass} target="_blank">
        {chunks}
      </Link>
    ),
  };

  const label =
    variant === "checkout"
      ? t.rich("checkoutLabel", richTags)
      : t.rich("label", richTags);

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3",
        variant === "checkout" ? "text-sm text-zinc-400" : "text-sm text-muted-foreground",
        className,
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span className="leading-relaxed">{label}</span>
    </label>
  );
}
