"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateCompanyRegionalSettings } from "@/actions/settings/actions";
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
} from "@/config/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/features/settings/settings-primitives";
import type { Company, CompanySettings } from "@/types";

const schema = z.object({
  locale: z.enum(["pt-BR", "en-US", "de-DE"]),
  timezone: z.string().min(1),
  currency: z.enum(["BRL", "EUR", "USD"]),
});

type FormData = z.infer<typeof schema>;

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/Recife",
  "Europe/Berlin",
  "Europe/Lisbon",
  "UTC",
] as const;

interface CompanyRegionalFormProps {
  slug: string;
  company: Company;
}

function normalizeSettings(settings: CompanySettings | null | undefined): FormData {
  return {
    locale: (settings?.locale as FormData["locale"]) ?? DEFAULT_LOCALE,
    timezone: settings?.timezone ?? DEFAULT_TIMEZONE,
    currency: (settings?.currency as FormData["currency"]) ?? "EUR",
  };
}

export function CompanyRegionalForm({ slug, company }: CompanyRegionalFormProps) {
  const t = useTranslations("settings.company.regional");
  const [saving, setSaving] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: normalizeSettings(company.settings),
  });

  const locale = watch("locale");
  const timezone = watch("timezone");
  const currency = watch("currency");

  async function onSubmit(data: FormData) {
    setSaving(true);
    const result = await updateCompanyRegionalSettings(slug, data);
    setSaving(false);
    if (!result.success) toast.error(result.error);
    else toast.success(t("updated"));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SettingsSection
        title={t("title")}
        description={t("description")}
        footer={
          <Button type="submit" size="sm" disabled={saving} className="h-8 text-[11px]">
            {saving && <Loader2 className="animate-spin" />}
            {t("saveChanges")}
          </Button>
        }
      >
        <SettingsRow label={t("locale")} description={t("localeDescription")}>
          <Select
            value={locale}
            onValueChange={(v) => setValue("locale", v as FormData["locale"])}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">{t("localePt")}</SelectItem>
              <SelectItem value="en-US">{t("localeEn")}</SelectItem>
              <SelectItem value="de-DE">{t("localeDe")}</SelectItem>
            </SelectContent>
          </Select>
          {errors.locale && (
            <p className="text-[11px] text-destructive">{errors.locale.message}</p>
          )}
        </SettingsRow>

        <SettingsRow label={t("timezone")} description={t("timezoneDescription")}>
          <Select value={timezone} onValueChange={(v) => setValue("timezone", v)}>
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label={t("currency")} description={t("currencyDescription")}>
          <Select
            value={currency}
            onValueChange={(v) => setValue("currency", v as FormData["currency"])}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">{t("currencyBrl")}</SelectItem>
              <SelectItem value="EUR">{t("currencyEur")}</SelectItem>
              <SelectItem value="USD">{t("currencyUsd")}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
    </form>
  );
}
