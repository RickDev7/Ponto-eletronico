import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShellPage } from "@/components/design-system/app-shell";
import {
  DataSectionLabel,
  EmptyState,
  KpiCard,
  OperationsWorkspace,
  PageHeader,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import { WeeklyChart } from "@/components/features/dashboard/weekly-chart";
import { LiveCheckIns } from "@/components/features/dashboard/live-checkins";
import { CompletionRing } from "@/components/features/dashboard/completion-ring";
import { OnboardingChecklist } from "@/components/features/dashboard/onboarding-checklist";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  draft: "neutral",
  scheduled: "pending",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-destructive",
  high: "text-amber-600",
  normal: "",
  low: "text-muted-foreground",
};

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

const KPI_STRIP_CLASS =
  "py-1.5 px-2 sm:px-2.5 [&_p:first-child]:text-[1.75rem] [&_p:first-child]:font-bold [&_p:first-child]:leading-none [&_p:first-child]:tracking-tight [&_p:first-child]:text-foreground sm:[&_p:first-child]:text-[2rem] [&_p:nth-child(2)]:mt-0.5 [&_p:nth-child(2)]:text-[9px] [&_p:nth-child(2)]:font-semibold [&_p:nth-child(2)]:uppercase [&_p:nth-child(2)]:tracking-wider [&_p:nth-child(2)]:text-muted-foreground [&_svg]:size-3.5 [&_svg]:opacity-60";

interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
  href: string;
}

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface ChartDay {
  label: string;
  date: string;
  scheduled: number;
  completed: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string;
  service_type: string;
  address: { street: string; house_number: string | null; city: string } | { street: string; house_number: string | null; city: string }[] | null;
}

interface LiveCheckInItem {
  id: string;
  check_in_at: string;
  task_id: string;
  task_title: string;
  employee_name: string;
}

interface DashboardViewProps {
  companySlug: string;
  companyId: string;
  greeting: string;
  dateLabel: string;
  canWrite: boolean;
  showOnboarding: boolean;
  onboardingSteps: OnboardingStep[];
  stats: StatItem[];
  overdueTasks: number;
  gpsMissingCount: number;
  outOfRadiusCount: number;
  totalMonthly: number;
  completedMonthly: number;
  completionRate: number;
  chartDays: ChartDay[];
  recentTasks: RecentTask[] | null;
  openCheckIns: number;
  liveCheckIns: LiveCheckInItem[];
}

function QuickActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-[11px] font-medium transition-colors",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function PanelBar({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-3 shrink-0" />}
        {children}
      </span>
      {action}
    </div>
  );
}

function TaskRow({
  task,
  companySlug,
  statusLabel,
  notAvailable,
  dateLocale,
}: {
  task: RecentTask;
  companySlug: string;
  statusLabel: string;
  notAvailable: string;
  dateLocale: string;
}) {
  const statusTone = STATUS_TONE[task.status as TaskStatus] ?? STATUS_TONE.draft;
  const addr = Array.isArray(task.address) ? task.address[0] : task.address;

  return (
    <li>
      <Link
        href={`/${companySlug}/tasks/${task.id}`}
        className="group flex items-center gap-2 px-2.5 py-1 transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[12px] font-medium leading-tight group-hover:text-primary",
              PRIORITY_COLOR[task.priority] ?? "",
            )}
          >
            {task.title}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {addr
              ? `${addr.street} ${addr.house_number ?? ""}, ${addr.city}`
              : notAvailable}
            {" · "}
            {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge
          status={statusTone}
          label={statusLabel}
          className="hidden shrink-0 text-[10px] sm:inline-flex"
        />
      </Link>
    </li>
  );
}

function groupOperationalTasks(tasks: RecentTask[] | null, todayIso: string) {
  if (!tasks?.length) {
    return {
      inProgress: [] as RecentTask[],
      overdue: [] as RecentTask[],
      today: [] as RecentTask[],
      upcoming: [] as RecentTask[],
    };
  }

  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const overdue = tasks.filter(
    (t) => t.status !== "in_progress" && t.scheduled_date < todayIso,
  );
  const today = tasks.filter(
    (t) => t.status !== "in_progress" && t.scheduled_date === todayIso,
  );
  const upcoming = tasks.filter(
    (t) => t.status !== "in_progress" && t.scheduled_date > todayIso,
  );

  return { inProgress, overdue, today, upcoming };
}

export async function DashboardView({
  companySlug,
  companyId,
  greeting,
  dateLabel,
  canWrite,
  showOnboarding,
  onboardingSteps,
  stats,
  overdueTasks,
  gpsMissingCount,
  outOfRadiusCount,
  totalMonthly,
  completedMonthly,
  completionRate,
  chartDays,
  recentTasks,
  openCheckIns,
  liveCheckIns,
}: DashboardViewProps) {
  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("status");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const dateLocale = LOCALE_MAP[locale] ?? locale;

  const todayIso = new Date().toISOString().slice(0, 10);
  const hasAlerts = overdueTasks > 0 || gpsMissingCount > 0 || outOfRadiusCount > 0;
  const hasAttention = hasAlerts || openCheckIns > 0;
  const taskGroups = groupOperationalTasks(recentTasks, todayIso);
  const hasTasks =
    taskGroups.inProgress.length +
      taskGroups.overdue.length +
      taskGroups.today.length +
      taskGroups.upcoming.length >
    0;

  function statusLabel(status: string) {
    return tStatus(status as TaskStatus);
  }

  const taskRowProps = {
    companySlug,
    notAvailable: tCommon("notAvailable"),
    dateLocale,
  };

  return (
    <AppShellPage className="space-y-2">
      <PageHeader
        title={greeting}
        description={dateLabel}
        size="sm"
        compact
        actions={
          canWrite ? (
            <>
              <QuickActionLink href={`/${companySlug}/tasks`} label={t("quickActions.tasks")} primary />
              <QuickActionLink href={`/${companySlug}/calendar`} label={t("quickActions.calendar")} />
              <QuickActionLink href={`/${companySlug}/employees`} label={t("quickActions.team")} />
              <QuickActionLink href={`/${companySlug}/activity`} label={t("quickActions.activity")} />
              <QuickActionLink href={`/${companySlug}/audits`} label={t("quickActions.audits")} />
            </>
          ) : undefined
        }
      />

      {showOnboarding && (
        <OnboardingChecklist slug={companySlug} steps={onboardingSteps} />
      )}

      <OperationsWorkspace>
        {hasAttention && (
          <div className="flex flex-col border-b border-border lg:flex-row lg:items-stretch">
            {hasAlerts && (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 bg-destructive/[0.05] px-2.5 py-1 text-[11px] lg:border-r lg:border-border">
                <span className="flex shrink-0 items-center gap-1 font-semibold text-destructive">
                  <AlertTriangle className="size-3" />
                  {t("sections.attention")}
                </span>
                {overdueTasks > 0 && (
                  <Link href={`/${companySlug}/tasks`} className="text-foreground hover:underline">
                    {t("alerts.sla")}{" "}
                    <strong className="font-bold tabular-nums">{overdueTasks}</strong>
                  </Link>
                )}
                {gpsMissingCount > 0 && (
                  <Link href={`/${companySlug}/audits?days=7`} className="text-foreground hover:underline">
                    {t("alerts.gps")}{" "}
                    <strong className="font-bold tabular-nums">{gpsMissingCount}</strong>
                  </Link>
                )}
                {outOfRadiusCount > 0 && (
                  <Link href={`/${companySlug}/audits?days=7`} className="text-foreground hover:underline">
                    {t("alerts.radius")}{" "}
                    <strong className="font-bold tabular-nums">{outOfRadiusCount}</strong>
                  </Link>
                )}
              </div>
            )}
            {openCheckIns > 0 && (
              <LiveCheckIns
                slug={companySlug}
                companyId={companyId}
                initialCheckIns={liveCheckIns}
                variant="embedded"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {stats.map((stat) => (
            <KpiCard
              key={stat.title}
              variant="strip"
              label={stat.title}
              value={stat.value}
              icon={stat.icon}
              iconClassName={stat.color}
              href={stat.href}
              className={KPI_STRIP_CLASS}
            />
          ))}
        </div>

        <div className="grid border-t border-border lg:grid-cols-12">
          <div className="border-b border-border lg:col-span-7 lg:border-b-0 lg:border-r">
            <PanelBar
              icon={ClipboardList}
              action={
                <Link
                  href={`/${companySlug}/tasks`}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  {tCommon("viewAllArrow")}
                </Link>
              }
            >
              {t("sections.schedule")}
            </PanelBar>
            {!hasTasks ? (
              <EmptyState
                icon={CheckCircle2}
                title={t("empty.noOpenTasks")}
                size="sm"
                className="py-4"
              />
            ) : (
              <ul className="divide-y divide-border">
                {taskGroups.inProgress.length > 0 && (
                  <>
                    <DataSectionLabel>{t("taskGroups.inProgress")}</DataSectionLabel>
                    {taskGroups.inProgress.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        statusLabel={statusLabel(task.status)}
                        {...taskRowProps}
                      />
                    ))}
                  </>
                )}
                {taskGroups.overdue.length > 0 && (
                  <>
                    <DataSectionLabel>{t("taskGroups.overdue")}</DataSectionLabel>
                    {taskGroups.overdue.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        statusLabel={statusLabel(task.status)}
                        {...taskRowProps}
                      />
                    ))}
                  </>
                )}
                {taskGroups.today.length > 0 && (
                  <>
                    <DataSectionLabel>{t("taskGroups.today")}</DataSectionLabel>
                    {taskGroups.today.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        statusLabel={statusLabel(task.status)}
                        {...taskRowProps}
                      />
                    ))}
                  </>
                )}
                {taskGroups.upcoming.length > 0 && (
                  <>
                    <DataSectionLabel>{t("taskGroups.upcoming")}</DataSectionLabel>
                    {taskGroups.upcoming.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        statusLabel={statusLabel(task.status)}
                        {...taskRowProps}
                      />
                    ))}
                  </>
                )}
              </ul>
            )}
          </div>

          <div className="lg:col-span-5">
            <PanelBar icon={TrendingUp}>{t("sections.weeklyTrend")}</PanelBar>
            <div className="border-b border-border px-2.5 py-1.5">
              <WeeklyChart days={chartDays} compact />
            </div>
            {totalMonthly > 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <div className="relative size-6 shrink-0">
                  <CompletionRing percentage={completionRate} size={24} stroke={2.5} />
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">
                    {completionRate}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-[11px] leading-tight">
                  <p className="font-semibold tabular-nums text-foreground">
                    {t("completion.percentCompleted", { rate: completionRate })}
                  </p>
                  <p className="text-muted-foreground">
                    {t("completion.monthlyProgress", {
                      completed: completedMonthly,
                      total: totalMonthly,
                    })}
                  </p>
                </div>
                <Link
                  href={`/${companySlug}/tasks?status=completed`}
                  className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                >
                  {tCommon("doneArrow")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </OperationsWorkspace>
    </AppShellPage>
  );
}
