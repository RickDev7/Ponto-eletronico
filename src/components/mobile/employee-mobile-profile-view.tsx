"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Clock,
  FileText,
  Globe,
  LogOut,
  Moon,
  Shield,
  TreePalm,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { signOut } from "@/actions/auth";
import type { CompanyContext } from "@/types/database";
import { EmployeeDeviceLockSettings } from "@/components/pwa/employee-device-lock-settings";
import {
  AppAvatar,
  AppButton,
  AppCard,
  AppScreen,
  AppSectionTitle,
} from "@/components/mobile/app";

interface EmployeeMobileProfileViewProps {
  slug: string;
  ctx: CompanyContext;
}

function ProfileMenuRow({
  icon: Icon,
  label,
  description,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex size-10 items-center justify-center rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)]/10">
        <Icon className="size-5 text-[var(--mobile-primary)]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--mobile-text)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--mobile-secondary)]">{description}</p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="mobile-pressable flex items-center gap-4 border-b border-[var(--mobile-border)] px-4 py-4 last:border-0"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mobile-pressable flex w-full items-center gap-4 border-b border-[var(--mobile-border)] px-4 py-4 text-left last:border-0"
    >
      {inner}
    </button>
  );
}

export function EmployeeMobileProfileView({ slug, ctx }: EmployeeMobileProfileViewProps) {
  const t = useTranslations("employee.mobile.profile");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  async function handleSignOut() {
    const id = toast.loading(tAuth("signingOut"));
    const result = await signOut();
    toast.dismiss(id);
    if (!result.success) {
      toast.error(tErrors("signOutFailed"));
      return;
    }
    router.push(ROUTES.login);
    router.refresh();
  }

  const name = ctx.profile.full_name ?? "—";
  const role = ctx.employee?.job_title ?? t("roleEmployee");

  return (
    <AppScreen>
      <AppCard className="flex flex-col items-center p-6 text-center">
        <AppAvatar name={name} size="lg" className="mb-4" />
        <h1 className="text-xl font-bold text-[var(--mobile-text)]">{name}</h1>
        <p className="mt-1 text-sm text-[var(--mobile-secondary)]">{role}</p>
        {ctx.employee?.employee_number && (
          <span className="mt-3 rounded-full bg-[var(--mobile-muted)] px-3 py-1 text-xs font-medium text-[var(--mobile-secondary)]">
            #{ctx.employee.employee_number}
          </span>
        )}
      </AppCard>

      <section className="space-y-3">
        <AppSectionTitle title={t("shortcutsTitle")} />
        <AppCard className="overflow-hidden p-0">
          <ProfileMenuRow
            icon={Clock}
            label={t("shortcuts.hours")}
            href={ROUTES.mobileHours(slug)}
          />
          <ProfileMenuRow
            icon={TreePalm}
            label={t("shortcuts.vacations")}
            description={t("vacationsHint")}
            href={ROUTES.mobileVacations(slug)}
          />
          <ProfileMenuRow
            icon={FileText}
            label={t("shortcuts.reports")}
            href={ROUTES.mobileReports(slug)}
          />
        </AppCard>
      </section>

      <section className="space-y-3">
        <AppSectionTitle title={t("settingsTitle")} />
        <AppCard className="overflow-hidden p-0">
          <ProfileMenuRow icon={Globe} label={t("language")} href={ROUTES.mobileProfile(slug)} />
          <ProfileMenuRow icon={Moon} label={t("theme")} href={ROUTES.mobileProfile(slug)} />
          <ProfileMenuRow icon={Shield} label={t("documents")} href={ROUTES.mobileReports(slug)} />
        </AppCard>
      </section>

      {ctx.employee && (
        <EmployeeDeviceLockSettings
          slug={slug}
          employeeId={ctx.employee.id}
          displayName={ctx.profile.full_name ?? ctx.employee.full_name}
        />
      )}

      <AppButton variant="outline" onClick={handleSignOut} className="border-[var(--mobile-danger)]/30 text-[var(--mobile-danger)]">
        <LogOut className="size-4" />
        {t("signOut")}
      </AppButton>
    </AppScreen>
  );
}
