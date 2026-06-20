"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateProfile } from "@/actions/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsRow } from "@/components/features/settings/settings-primitives";
import type { Profile, CompanyMember } from "@/types";

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface ProfileFormProps {
  slug: string;
  profile: Profile;
  membership: CompanyMember;
  embedded?: boolean;
}

export function ProfileForm({
  slug,
  profile,
  membership,
  embedded = false,
}: ProfileFormProps) {
  const t = useTranslations("settings.profile");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const result = await updateProfile(slug, data);
    setSaving(false);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("profileUpdated"));
  }

  const roleLabel = tRoles(membership.role as "admin" | "supervisor" | "employee");

  if (embedded) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
        <SettingsRow label={t("avatar")} description={t("avatarDescription")}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(profile.full_name ?? "?")[0].toUpperCase()}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {roleLabel}
            </Badge>
          </div>
        </SettingsRow>
        <SettingsRow label={t("fullName")} description={t("fullNameDescription")}>
          <div className="space-y-1">
            <Input {...register("full_name")} placeholder={t("fullName")} className="h-8 text-[12px]" />
            {errors.full_name && (
              <p className="text-[11px] text-destructive">{errors.full_name.message}</p>
            )}
          </div>
        </SettingsRow>
        <SettingsRow label={t("phone")} description={t("phoneDescription")}>
          <Input {...register("phone")} placeholder={t("phone")} className="h-8 text-[12px]" />
        </SettingsRow>
        <div className="flex justify-end border-t border-border/40 pt-4">
          <Button type="submit" size="sm" disabled={saving} className="h-8 text-[11px]">
            {saving && <Loader2 className="animate-spin" />}
            {t("saveProfile")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {(profile.full_name ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{profile.full_name}</p>
          <Badge variant="outline" className="text-xs mt-0.5">
            {roleLabel}
          </Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("fullName")} *</Label>
          <Input {...register("full_name")} placeholder={t("fullName")} />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("phone")}</Label>
          <Input {...register("phone")} placeholder={t("phone")} />
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
