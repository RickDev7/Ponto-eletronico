"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateCompany } from "@/actions/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/features/settings/settings-primitives";
import type { Company } from "@/types";

const schema = z.object({
  name: z.string().min(2),
  legal_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface CompanyFormProps {
  slug: string;
  company: Company;
  embedded?: boolean;
}

export function CompanyForm({ slug, company, embedded = false }: CompanyFormProps) {
  const t = useTranslations("settings.company");
  const tCommon = useTranslations("common");
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company.name,
      legal_name: company.legal_name ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      tax_id: company.tax_id ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const result = await updateCompany(slug, data);
    setSaving(false);
    if (!result.success) toast.error(result.error);
    else toast.success(t("updated"));
  }

  const fields = (
    <>
      <SettingsRow label={t("displayName")} description={t("displayNameDescription")}>
        <div className="space-y-1">
          <Input {...register("name")} placeholder={t("name")} className="h-8 text-[12px]" />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
        </div>
      </SettingsRow>
      <SettingsRow label={t("legalName")} description={t("legalNameDescription")}>
        <Input {...register("legal_name")} placeholder={t("legalName")} className="h-8 text-[12px]" />
      </SettingsRow>
      <SettingsRow label={t("businessAddress")} description={t("businessAddress")}>
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">{t("businessAddressHint")}</p>
          <Link
            href={`/${slug}/addresses`}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[11px] font-medium transition-colors hover:bg-muted/50"
          >
            {t("manageAddresses")}
          </Link>
        </div>
      </SettingsRow>
      <SettingsRow label={t("taxId")} description={t("taxIdDescription")}>
        <Input {...register("tax_id")} placeholder="DE123456789" className="h-8 text-[12px] font-mono" />
      </SettingsRow>
      <SettingsRow label={t("contactEmail")} description={t("contactEmailDescription")}>
        <div className="space-y-1">
          <Input {...register("email")} type="email" placeholder="info@company.com" className="h-8 text-[12px]" />
          {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
        </div>
      </SettingsRow>
      <SettingsRow label={t("phone")} description={t("phoneDescription")}>
        <Input {...register("phone")} placeholder="+55 11 12345678" className="h-8 text-[12px]" />
      </SettingsRow>
      <SettingsRow label={t("workspaceUrl")} description={t("workspaceUrlDescription")}>
        <div className="space-y-1">
          <Input value={company.slug} disabled className="h-8 font-mono text-[11px]" />
          <p className="text-[11px] text-muted-foreground">{t("slugLocked")}</p>
        </div>
      </SettingsRow>
    </>
  );

  if (embedded) {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <SettingsSection
          title={t("masterDataTitle")}
          description={t("masterDataDescription")}
          footer={
            <Button type="submit" size="sm" disabled={saving} className="h-8 text-[11px]">
              {saving && <Loader2 className="animate-spin" />}
              {t("saveChanges")}
            </Button>
          }
        >
          {fields}
        </SettingsSection>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("name")} *</Label>
          <Input {...register("name")} placeholder={t("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("legalName")}</Label>
          <Input {...register("legal_name")} placeholder={t("legalName")} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("contactEmail")}</Label>
          <Input {...register("email")} type="email" placeholder="info@company.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("phone")}</Label>
          <Input {...register("phone")} placeholder="+55 11 12345678" />
        </div>
        <div className="space-y-1.5">
          <Label>{t("taxId")}</Label>
          <Input {...register("tax_id")} placeholder="DE123456789" />
        </div>
        <div className="space-y-1.5">
          <Label>{t("slug")}</Label>
          <Input value={company.slug} disabled className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">{t("slugLocked")}</p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
