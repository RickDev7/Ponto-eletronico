"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { useSearchParams } from "next/navigation";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  CreditCard,
  Download,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Plug,
  Rows3,
  Shield,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { OperationsPage } from "@/components/shared/workspace";
import { ASSIGNABLE_ROLES } from "@/types/enums";
import { getPermissions } from "@/config/permissions";
import type { Company, CompanyMember, MemberRole, Profile } from "@/types";
import { PasswordResetButton } from "@/components/features/settings/password-reset-button";
import { CompanyForm } from "@/components/features/settings/company-form";
import { CompanyRegionalForm } from "@/components/features/settings/company-regional-form";
import { ProfileForm } from "@/components/features/settings/profile-form";
import { MembersPanel } from "@/components/features/settings/members-panel";
import {
  SettingsPanel,
  SettingsPlaceholder,
  SettingsRow,
  SettingsSection,
} from "@/components/features/settings/settings-primitives";
import { cn } from "@/lib/utils";
import {
  useNotificationPreferences,
  type NotificationPreferenceKey,
} from "@/hooks/use-notification-preferences";
import { useUiDensity, type UiDensity } from "@/hooks/use-ui-density";
import { useSwitchLocale } from "@/hooks/use-switch-locale";
import { localeDefinitions } from "@/i18n/config";
import { updateProfile } from "@/actions/settings/actions";
import type { AppLocale } from "@/i18n/routing";
import type { CompanyBillingState } from "@/lib/billing/utils";
import { formatPlanLimit, usagePercent } from "@/lib/billing/utils";

export type SettingsTab =
  | "company"
  | "team"
  | "billing"
  | "notifications"
  | "security"
  | "integrations"
  | "appearance";

interface NavItem {
  id: SettingsTab;
  icon: LucideIcon;
  adminOnly?: boolean;
  supervisorPlus?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "company", icon: Building2, adminOnly: true },
  { id: "team", icon: Users, adminOnly: true },
  { id: "billing", icon: CreditCard, adminOnly: true },
  { id: "notifications", icon: Bell },
  { id: "security", icon: Shield },
  { id: "integrations", icon: Plug, adminOnly: true },
  { id: "appearance", icon: Palette },
];

const PERMISSION_KEYS: Record<string, string> = {
  "company:read": "companyRead",
  "company:update": "companyUpdate",
  "members:manage": "membersManage",
  "employees:read": "employeesRead",
  "employees:write": "employeesWrite",
  "employees:delete": "employeesDelete",
  "clients:read": "clientsRead",
  "clients:write": "clientsWrite",
  "clients:delete": "clientsDelete",
  "addresses:read": "addressesRead",
  "addresses:write": "addressesWrite",
  "addresses:delete": "addressesDelete",
  "tasks:read": "tasksRead",
  "tasks:write": "tasksWrite",
  "tasks:delete": "tasksDelete",
  "tasks:assign": "tasksAssign",
  "checkins:read": "checkinsRead",
  "checkins:write": "checkinsWrite",
  "photos:upload": "photosUpload",
  "photos:delete": "photosDelete",
  "reports:read": "reportsRead",
  "reports:generate": "reportsGenerate",
  "reports:delete": "reportsDelete",
  "activity:read": "activityRead",
  "invites:manage": "invitesManage",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMember = any;

interface SettingsViewProps {
  slug: string;
  company: Company;
  profile: Profile;
  membership: CompanyMember;
  members: AnyMember[];
  isAdmin: boolean;
  isSupervisorPlus: boolean;
  billing: CompanyBillingState | null;
  userEmail: string;
}

function tabTitle(tab: SettingsTab, tSections: ReturnType<typeof useTranslations<"settings.sections">>) {
  return tSections(tab);
}

function PermissionsMatrix() {
  const tMatrix = useTranslations("settings.permissionsMatrix");
  const tPerm = useTranslations("settings.permissions");
  const tRoles = useTranslations("roles");

  return (
    <div className="overflow-x-auto">
      <table className="ui-density-table w-full min-w-[520px] text-left text-[11px]">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">{tMatrix("title")}</th>
            {ASSIGNABLE_ROLES.map((role) => (
              <th key={role} className="pb-2 px-2 text-center font-medium">
                {tRoles(role)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(PERMISSION_KEYS).map((perm) => (
            <tr key={perm} className="border-b border-border/30 last:border-0">
              <td className="py-2 pr-4 text-foreground">
                {tPerm(PERMISSION_KEYS[perm] as Parameters<typeof tPerm>[0])}
              </td>
              {ASSIGNABLE_ROLES.map((role) => {
                const has = getPermissions(role).includes(perm as never);
                return (
                  <td key={role} className="py-2 px-2 text-center">
                    <span
                      className={cn(
                        "inline-block size-1.5 rounded-full",
                        has ? "bg-emerald-500" : "bg-muted-foreground/25",
                      )}
                      title={has ? tMatrix("allowed") : tMatrix("denied")}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotificationToggle({
  preferenceKey,
  userId,
  label,
  description,
  defaultChecked = true,
}: {
  preferenceKey: NotificationPreferenceKey;
  userId: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const { getPreference, setPreference } = useNotificationPreferences(userId);
  const checked = getPreference(preferenceKey, defaultChecked);

  return (
    <SettingsRow label={label} description={description}>
      <div className="flex justify-end sm:justify-start">
        <Switch
          checked={checked}
          onCheckedChange={(value) => setPreference(preferenceKey, value)}
          aria-label={label}
        />
      </div>
    </SettingsRow>
  );
}

function AppearanceSection({ slug, profile }: { slug: string; profile: Profile }) {
  const t = useTranslations("settings.appearance");
  const tCommon = useTranslations("common");
  const { theme, applyTheme, isDark } = useThemePreference(slug);
  const { density, setDensity, mounted: densityMounted } = useUiDensity();
  const { locale, switchLocale, isPending: localePending } = useSwitchLocale();
  const [mounted, setMounted] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);

  useEffect(() => setMounted(true), []);

  const profileLocale = (profile.locale === "en" ? "en" : "pt") as AppLocale;

  async function handleLocaleChange(next: AppLocale) {
    if (next === locale) return;
    setSavingLocale(true);
    const result = await updateProfile(slug, {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      locale: next,
    });
    setSavingLocale(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    switchLocale(next);
  }

  const densityOptions: {
    id: UiDensity;
    label: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      id: "comfortable",
      label: t("densityComfortable"),
      description: t("densityComfortableDescription"),
      icon: LayoutGrid,
    },
    {
      id: "compact",
      label: t("densityCompact"),
      description: t("densityCompactDescription"),
      icon: Rows3,
    },
  ];

  return (
    <SettingsPanel>
      <SettingsSection
        title={t("colorScheme")}
        description={t("colorSchemeDescription")}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { id: "light" as const, label: tCommon("light"), icon: Sun, description: t("lightDescription") },
            { id: "dark" as const, label: tCommon("dark"), icon: Moon, description: t("darkDescription") },
            { id: "system" as const, label: tCommon("system"), icon: Monitor, description: t("systemDescription") },
          ].map(({ id, label, icon: Icon, description }) => {
            const active = mounted && theme === id;
            return (
              <button
                key={id}
                type="button"
                suppressHydrationWarning
                onClick={() => applyTheme(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-foreground/25 bg-foreground/5 ring-1 ring-foreground/10"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    id === "light"
                      ? "bg-white text-amber-500 shadow-sm ring-1 ring-border/60"
                      : id === "dark"
                        ? "bg-slate-900 text-slate-100"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-[12px] font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("currentMode", {
            mode: mounted ? (isDark ? t("darkMode") : t("lightMode")) : "…",
          })}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t("language")}
        description={t("languageDescription")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {localeDefinitions.map((item) => {
            const active = locale === item.code;
            return (
              <button
                key={item.code}
                type="button"
                disabled={savingLocale || localePending}
                onClick={() => handleLocaleChange(item.code)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-foreground/25 bg-foreground/5 ring-1 ring-foreground/10"
                    : "border-border/60 hover:bg-muted/40",
                  (savingLocale || localePending) && "opacity-60",
                )}
              >
                <span className="text-lg leading-none">{item.flag}</span>
                <div>
                  <p className="text-[12px] font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.code === profileLocale
                      ? t("languageSaved")
                      : t("languageSwitchHint")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title={t("density")} description={t("densityDescription")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {densityOptions.map(({ id, label, description, icon: Icon }) => {
            const active = densityMounted && density === id;
            return (
              <button
                key={id}
                type="button"
                suppressHydrationWarning
                onClick={() => setDensity(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-foreground/25 bg-foreground/5 ring-1 ring-foreground/10"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-[12px] font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("densityCurrent", {
            mode:
              densityMounted && density === "compact"
                ? t("densityCompact")
                : densityMounted
                  ? t("densityComfortable")
                  : "…",
          })}
        </p>
      </SettingsSection>
    </SettingsPanel>
  );
}

export function SettingsView({
  slug,
  company,
  profile,
  membership,
  members,
  isAdmin,
  isSupervisorPlus,
  billing,
  userEmail,
}: SettingsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("settings");
  const tSections = useTranslations("settings.sections");
  const tBilling = useTranslations("settings.billing");
  const tNotifications = useTranslations("settings.notifications");
  const tSecurity = useTranslations("settings.security");
  const tIntegrations = useTranslations("settings.integrations");
  const tBrand = useTranslations("settings.brand");
  const tTeam = useTranslations("settings.team");
  const tCompany = useTranslations("settings.company");

  const visibleNav = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.supervisorPlus && !isSupervisorPlus) return false;
        return true;
      }),
    [isAdmin, isSupervisorPlus],
  );

  const defaultTab = visibleNav[0]?.id ?? "security";
  const paramTab = searchParams.get("tab") as SettingsTab | null;
  const activeTab =
    paramTab && visibleNav.some((n) => n.id === paramTab) ? paramTab : defaultTab;

  const setTab = useCallback(
    (tab: SettingsTab) => {
      router.replace(`/${slug}/settings?tab=${tab}`, { scroll: false });
    },
    [router, slug],
  );

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-3 lg:self-start">
          <SettingsPanel className="p-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" />
                  {tSections(item.id)}
                </button>
              );
            })}
          </SettingsPanel>
        </nav>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              {tabTitle(activeTab, tSections)}
            </h2>
          </div>

          {activeTab === "company" && isAdmin && (
            <SettingsPanel>
              <SettingsSection
                title={tBrand("title")}
                description={tBrand("description")}
              >
                <SettingsRow
                  label={tCompany("logo")}
                  description={tBrand("description")}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/30 text-lg font-semibold text-muted-foreground">
                      {company.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={company.logo_url}
                          alt=""
                          className="size-full rounded-lg object-cover"
                        />
                      ) : (
                        company.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-1">
                      <Button size="sm" variant="outline" disabled className="h-7 text-[11px]">
                        {tBrand("uploadLogo")}
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        {tBrand("logoHint")}
                      </p>
                    </div>
                  </div>
                </SettingsRow>
              </SettingsSection>

              <CompanyForm slug={slug} company={company} embedded />
              {isAdmin && (
                <CompanyRegionalForm slug={slug} company={company} />
              )}
            </SettingsPanel>
          )}

          {activeTab === "team" && isAdmin && (
            <div className="space-y-3">
              <SettingsPanel>
                <SettingsSection
                  title={tTeam("membersTitle")}
                  description={tTeam("membersDescription")}
                >
                  <MembersPanel
                    slug={slug}
                    members={members}
                    currentMemberId={membership.id}
                    embedded
                  />
                </SettingsSection>
              </SettingsPanel>

              <SettingsPanel>
                <SettingsSection
                  title={tTeam("rolesPermissionsTitle")}
                  description={tTeam("rolesPermissionsDescription")}
                >
                  <PermissionsMatrix />
                </SettingsSection>
              </SettingsPanel>
            </div>
          )}

          {activeTab === "billing" && isAdmin && billing && (
            <SettingsPanel>
              <SettingsSection
                title={tBilling("currentPlan")}
                description={tBilling("description")}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">{billing.planName}</p>
                      <Badge
                        variant={billing.canWrite ? "secondary" : "destructive"}
                        className="h-5 text-[10px]"
                      >
                        {billing.status === "none" ? tBilling("planActive") : billing.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {tBilling("planDescription")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={ROUTES.pricing}>{tBilling("upgrade")}</Link>
                  </Button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    { label: tBilling("employees"), value: billing.usage.employees },
                    { label: tBilling("tasks"), value: billing.usage.tasksThisMonth },
                    { label: tBilling("clients"), value: billing.usage.clients },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <p className="text-lg font-semibold tabular-nums">{item.value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection
                title={tBilling("usageTitle")}
                description={tBilling("usageDescription")}
              >
                <SettingsRow label={tBilling("deployments")} description={tBilling("deploymentsDescription")}>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {tBilling("usageOf", {
                          used: billing.usage.tasksThisMonth,
                          limit: formatPlanLimit(billing.limits.tasksPerMonth),
                        })}
                      </span>
                      <span className="font-medium">
                        {usagePercent(
                          billing.usage.tasksThisMonth,
                          billing.limits.tasksPerMonth,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${usagePercent(
                            billing.usage.tasksThisMonth,
                            billing.limits.tasksPerMonth,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </SettingsRow>
                <SettingsRow label={tBilling("teamSlots")} description={tBilling("teamSlotsDescription")}>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {tBilling("usageOf", {
                          used: billing.usage.billableSeats,
                          limit: formatPlanLimit(billing.limits.employees),
                        })}
                      </span>
                      <span className="font-medium">
                        {usagePercent(
                          billing.usage.billableSeats,
                          billing.limits.employees,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${usagePercent(
                            billing.usage.billableSeats,
                            billing.limits.employees,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title={tBilling("invoices")}
                description={tBilling("invoicesDescription")}
              >
                <SettingsPlaceholder>
                  {tBilling("invoicesPlaceholder")}
                </SettingsPlaceholder>
              </SettingsSection>
            </SettingsPanel>
          )}

          {activeTab === "notifications" && (
            <SettingsPanel>
              <SettingsSection
                title={tNotifications("emailSection")}
                description={tNotifications("emailSectionDescription")}
              >
                <NotificationToggle
                  preferenceKey="overdueTasks"
                  userId={profile.id}
                  label={tNotifications("overdueTasks")}
                  description={tNotifications("overdueTasksDescription")}
                />
                <NotificationToggle
                  preferenceKey="checkInWarnings"
                  userId={profile.id}
                  label={tNotifications("checkInWarnings")}
                  description={tNotifications("checkInWarningsDescription")}
                />
                <NotificationToggle
                  preferenceKey="newInvites"
                  userId={profile.id}
                  label={tNotifications("newInvites")}
                  description={tNotifications("newInvitesDescription")}
                  defaultChecked={isAdmin}
                />
                <NotificationToggle
                  preferenceKey="weeklyReport"
                  userId={profile.id}
                  label={tNotifications("weeklyReport")}
                  description={tNotifications("weeklyReportDescription")}
                />
              </SettingsSection>

              <SettingsSection
                title={tNotifications("inAppSection")}
                description={tNotifications("inAppSectionDescription")}
              >
                <NotificationToggle
                  preferenceKey="activityFeed"
                  userId={profile.id}
                  label={tNotifications("activityFeed")}
                  description={tNotifications("activityFeedDescription")}
                  defaultChecked
                />
                <NotificationToggle
                  preferenceKey="taskAssignments"
                  userId={profile.id}
                  label={tNotifications("taskAssignments")}
                  description={tNotifications("taskAssignmentsDescription")}
                  defaultChecked
                />
              </SettingsSection>
              <div className="border-t border-border/40 bg-muted/10 px-5 py-3">
                <p className="text-[11px] text-muted-foreground">
                  {tNotifications("localStorageNote")}
                </p>
              </div>
            </SettingsPanel>
          )}

          {activeTab === "security" && (
            <div className="space-y-3">
              <SettingsPanel>
                <SettingsSection
                  title={tSecurity("profileSection")}
                  description={tSecurity("profileSectionDescription")}
                >
                  <ProfileForm
                    slug={slug}
                    profile={profile}
                    membership={membership}
                    embedded
                  />
                </SettingsSection>
              </SettingsPanel>

              <SettingsPanel>
                <SettingsSection
                  title={tSecurity("passwordSection")}
                  description={tSecurity("passwordSectionDescription")}
                >
                  <SettingsRow
                    label={tSecurity("changePassword")}
                    description={tSecurity("passwordChangeDescription")}
                  >
                    <PasswordResetButton email={userEmail} />
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title={tSecurity("twoFactor")}
                  description={tSecurity("mfaDescription")}
                >
                  <SettingsRow
                    label={tSecurity("mfaLabel")}
                    description={tSecurity("mfaDescription")}
                  >
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <Badge variant="outline" className="text-[10px]">
                        {tSecurity("mfaInactive")}
                      </Badge>
                      <Switch disabled aria-label={tSecurity("mfaEnableAria")} />
                    </div>
                  </SettingsRow>
                </SettingsSection>

                <SettingsSection
                  title={tSecurity("sessions")}
                  description={tSecurity("sessionsDescription")}
                >
                  <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{tSecurity("currentSession")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tSecurity("currentSessionDescription", { name: profile.full_name ?? "" })}
                        </p>
                      </div>
                      <Badge className="h-5 shrink-0 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
                        {tSecurity("sessionActive")}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {tSecurity("remoteSignOutNote")}
                  </p>
                </SettingsSection>
              </SettingsPanel>
            </div>
          )}

          {activeTab === "integrations" && isAdmin && (
            <SettingsPanel>
              <SettingsSection
                title={tIntegrations("connectedServices")}
                description={tIntegrations("connectedServicesDescription")}
              >
                <div className="space-y-2">
                  {[
                    { name: "Google Calendar", desc: tIntegrations("googleCalendar") },
                    { name: "Slack", desc: tIntegrations("slack") },
                    { name: "DATEV", desc: tIntegrations("datev") },
                  ].map((integration) => (
                    <div
                      key={integration.name}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-[12px] font-medium">{integration.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {integration.desc}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" disabled className="h-7 text-[11px]">
                        {tIntegrations("connect")}
                      </Button>
                    </div>
                  ))}
                </div>
              </SettingsSection>

              {isSupervisorPlus && (
                <SettingsSection
                  title={tIntegrations("templatesSection")}
                  description={tIntegrations("templatesSectionDescription")}
                >
                  <Link
                    href={`/${slug}/settings/templates`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[11px] font-medium transition-colors hover:bg-muted/50"
                  >
                    {tIntegrations("manageTemplates")}
                  </Link>
                </SettingsSection>
              )}

              <SettingsSection
                title={tIntegrations("dataExport")}
                description={tIntegrations("dataExportDescription")}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { type: "tasks", label: tIntegrations("exportTasks") },
                    { type: "employees", label: tIntegrations("exportEmployees") },
                    { type: "clients", label: tIntegrations("exportClients") },
                    { type: "addresses", label: tIntegrations("exportAddresses") },
                  ].map((e) => (
                    <Link
                      key={e.type}
                      href={`/${slug}/settings/export?type=${e.type}`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border/60 text-[11px] font-medium transition-colors hover:bg-muted/50"
                    >
                      <Download className="size-3.5 opacity-60" />
                      {e.label}
                    </Link>
                  ))}
                </div>
                {isSupervisorPlus && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {tIntegrations("operationalReports")}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Link
                        href={`/${slug}/reports/export?type=checkins`}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border/60 text-[11px] font-medium transition-colors hover:bg-muted/50"
                      >
                        <Download className="size-3.5 opacity-60" />
                        {tIntegrations("exportReportCheckins")}
                      </Link>
                      <Link
                        href={`/${slug}/reports/export?type=tasks`}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border/60 text-[11px] font-medium transition-colors hover:bg-muted/50"
                      >
                        <Download className="size-3.5 opacity-60" />
                        {tIntegrations("exportReportTasks")}
                      </Link>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {tIntegrations("dataExportLocaleHint")}
                </p>
              </SettingsSection>
            </SettingsPanel>
          )}

          {activeTab === "appearance" && (
            <AppearanceSection slug={slug} profile={profile} />
          )}
        </div>
      </div>
    </OperationsPage>
  );
}
