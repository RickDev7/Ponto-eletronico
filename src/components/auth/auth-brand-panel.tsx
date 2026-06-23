import { getTranslations } from "next-intl/server";
import {
  Briefcase,
  Check,
  ClipboardList,
  Globe2,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { DeviceFrame } from "@/components/marketing/device-frame";
import { DashboardPreview } from "@/components/marketing/app-previews";
import { cn } from "@/lib/utils";

const FEATURE_ICONS = [
  Briefcase,
  Users,
  Wallet,
  ClipboardList,
  Smartphone,
  Globe2,
] as const;

interface AuthBrandPanelProps {
  className?: string;
}

/** Left panel — product preview, value proposition, floating KPIs. */
export async function AuthBrandPanel({ className }: AuthBrandPanelProps) {
  const t = await getTranslations("auth.branding");

  const features = [
    t("features.workforcePlanning"),
    t("features.clientManagement"),
    t("features.financeBilling"),
    t("features.serviceOperations"),
    t("features.employeeMobile"),
    t("features.clientPortal"),
  ];

  const kpis = [
    { label: t("kpis.todayServices"), value: "24", tone: "text-primary" },
    { label: t("kpis.employeesScheduled"), value: "18", tone: "text-success" },
    { label: t("kpis.revenueMonth"), value: "€42k", tone: "text-foreground" },
    { label: t("kpis.openTasks"), value: "7", tone: "text-warning" },
  ];

  return (
    <div
      className={cn(
        "relative hidden flex-col justify-between overflow-hidden border-r border-border bg-muted/30 p-10 lg:flex lg:w-[60%] xl:p-14",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,var(--accent)_0%,transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 max-w-xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">
            {t("headline")}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("valueDescription")}
          </p>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Check;
            return (
              <li
                key={feature}
                className="flex items-center gap-2.5 text-sm text-foreground/90"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span>{feature}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-10 mt-10">
        <div className="relative mx-auto max-w-2xl">
          <DeviceFrame label="app.feldops.com" className="shadow-ds-medium">
            <DashboardPreview />
          </DeviceFrame>

          <div className="auth-kpi-float absolute -right-2 top-8 w-36 rounded-lg border border-border bg-card p-3 shadow-ds-soft">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpis[0].label}
            </p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", kpis[0].tone)}>
              {kpis[0].value}
            </p>
          </div>

          <div className="auth-kpi-float-delayed absolute -left-4 bottom-16 w-40 rounded-lg border border-border bg-card p-3 shadow-ds-soft">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpis[1].label}
            </p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", kpis[1].tone)}>
              {kpis[1].value}
            </p>
          </div>

          <div className="auth-kpi-float absolute right-12 -bottom-4 w-36 rounded-lg border border-border bg-card p-3 shadow-ds-soft">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpis[2].label}
            </p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", kpis[2].tone)}>
              {kpis[2].value}
            </p>
          </div>

          <div className="auth-kpi-float-delayed absolute left-16 top-2 w-32 rounded-lg border border-border bg-card p-3 shadow-ds-soft">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpis[3].label}
            </p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", kpis[3].tone)}>
              {kpis[3].value}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t("multiTenant")}</span>
        <span className="text-border">·</span>
        <span>{t("offline")}</span>
        <span className="text-border">·</span>
        <span>{t("gdpr")}</span>
      </div>
    </div>
  );
}
