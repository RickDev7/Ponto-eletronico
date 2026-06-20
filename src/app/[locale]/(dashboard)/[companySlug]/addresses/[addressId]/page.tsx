import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
  Hash,
  KeyRound,
  MapPin,
  Plus,
} from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceType, TaskStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("detail.pageTitle") };
}

interface PageProps {
  params: Promise<{ companySlug: string; addressId: string }>;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  draft: "text-muted-foreground",
  scheduled: "text-blue-600",
  in_progress: "text-amber-600",
  completed: "text-emerald-600",
  cancelled: "text-destructive",
};

function formatDuration(
  start: string,
  end: string | null,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (!end) return t("active");
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0
    ? t("durationHours", { hours: h, minutes: m })
    : t("durationMinutes", { minutes: m });
}

export default async function AddressDetailPage({ params }: PageProps) {
  const { companySlug, addressId } = await params;
  const [t, tNav, tStatus, tCheckIn, tServiceTypes, locale] = await Promise.all([
    getTranslations("properties"),
    getTranslations("navigation"),
    getTranslations("status"),
    getTranslations("tasks.checkIn"),
    getTranslations("serviceTypes"),
    getLocale(),
  ]);
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();

  const { data: address } = await supabase
    .from("addresses")
    .select(`
      *,
      client:clients(id, name, email, phone)
    `)
    .eq("id", addressId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!address) notFound();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [{ data: tasks }, { data: recentCheckIns }, { data: photos }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(`
          id, title, status, priority, service_type, scheduled_date,
          assignments:task_assignments(employee:employees(full_name))
        `)
        .eq("address_id", addressId)
        .eq("company_id", ctx.company.id)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: false })
        .limit(30),

      supabase
        .from("check_ins")
        .select(`
          id, check_in_at, check_out_at,
          employee:employees(full_name),
          task:tasks(title)
        `)
        .eq("address_id", addressId)
        .eq("company_id", ctx.company.id)
        .gte("check_in_at", ninetyDaysAgo.toISOString())
        .order("check_in_at", { ascending: false })
        .limit(20),

      supabase
        .from("task_photos")
        .select(`id, storage_path, caption, photo_type, taken_at, task:tasks(title)`)
        .eq("address_id", addressId)
        .eq("company_id", ctx.company.id)
        .order("taken_at", { ascending: false })
        .limit(12),
    ]);

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("task-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const client = Array.isArray(address.client)
    ? address.client[0]
    : address.client;

  const completedTasks = (tasks ?? []).filter((t) => t.status === "completed").length;
  const activeTasks = (tasks ?? []).filter(
    (t) => t.status === "scheduled" || t.status === "in_progress",
  ).length;
  const totalCheckIns = recentCheckIns?.length ?? 0;

  const totalMinutes = (recentCheckIns ?? []).reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return (
      acc +
      Math.floor(
        (new Date(ci.check_out_at).getTime() -
          new Date(ci.check_in_at).getTime()) /
          60_000,
      )
    );
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${address.street} ${address.house_number ?? ""}, ${address.postal_code} ${address.city}`,
  )}`;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <Link
        href={`/${companySlug}/addresses`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {tNav("properties")}
      </Link>

      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {address.label && (
                <p className="text-xs text-muted-foreground mb-0.5">
                  {address.label}
                </p>
              )}
              <h1 className="text-lg font-semibold">
                {address.street} {address.house_number}
              </h1>
              <p className="text-sm text-muted-foreground">
                {address.postal_code} {address.city}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/${companySlug}/tasks?address=${addressId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-3" />
                {t("detail.newTask")}
              </Link>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <ExternalLink className="size-3" />
                {t("detail.maps")}
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {(address.service_types as string[]).map((st) => (
              <Badge key={st} variant="secondary" className="text-xs">
                {tServiceTypes(st as ServiceType)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {client && (
        <div className="rounded-xl border p-4 flex items-start gap-3">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
            {client.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/${companySlug}/clients/${client.id}`}
              className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              {client.name}
            </Link>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
        </div>
      )}

      {address.access_notes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex gap-3">
          <KeyRound className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
              {t("detail.accessNotes")}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {address.access_notes}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("detail.stats.activeTasks"), value: activeTasks, icon: ClipboardList, color: "text-primary" },
          { label: t("detail.stats.completed"), value: completedTasks, icon: CheckCircle2, color: "text-emerald-600" },
          { label: t("detail.stats.checkIns90Days"), value: totalCheckIns, icon: Clock, color: "text-blue-600" },
          { label: t("detail.stats.hours90Days"), value: `${totalHours}h`, icon: Clock, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <s.icon className={`size-3.5 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {(address.floor ?? address.unit_number) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {address.floor && (
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5" />
              {t("detail.floor", { floor: address.floor })}
            </span>
          )}
          {address.unit_number && (
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5" />
              {t("detail.unit", { unit: address.unit_number })}
            </span>
          )}
        </div>
      )}

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />
            {t("detail.tasksHeading", { count: tasks?.length ?? 0 })}
          </h2>
          <Link
            href={`/${companySlug}/tasks?q=`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("detail.allTasks")}
          </Link>
        </div>

        {!tasks || tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            {t("detail.noTasksYet")}
          </p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => {
              const status = task.status as TaskStatus;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const assignees = (task.assignments as any[])
                ?.map((a) => (Array.isArray(a.employee) ? a.employee[0] : a.employee)?.full_name)
                .filter(Boolean);
              return (
                <Link
                  key={task.id}
                  href={`/${companySlug}/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tServiceTypes(task.service_type as ServiceType)}
                      {assignees?.length > 0 && ` · ${assignees.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.draft}`}>
                      {tStatus(status)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {totalCheckIns > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              {t("detail.checkInsHeading", { count: totalCheckIns })}
            </h2>
            <div className="space-y-1.5">
              {(recentCheckIns ?? []).map((ci) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const emp = Array.isArray(ci.employee) ? (ci.employee as any[])[0] : (ci.employee as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const task = Array.isArray(ci.task) ? (ci.task as any[])[0] : (ci.task as any);
                return (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {emp?.full_name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(ci.check_in_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 ${
                          !ci.check_out_at
                            ? "border-amber-300 text-amber-700"
                            : ""
                        }`}
                      >
                        {formatDuration(ci.check_in_at, ci.check_out_at, tCheckIn)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {photosWithUrls.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Camera className="size-4 text-muted-foreground" />
              {t("detail.photosHeading", { count: photosWithUrls.length })}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photosWithUrls.map((photo) => (
                photo.signedUrl ? (
                  <a
                    key={photo.id}
                    href={photo.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden border bg-muted hover:border-primary/40 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.signedUrl}
                      alt={photo.caption ?? t("detail.photoAlt")}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {photo.photo_type && (
                      <div className="absolute bottom-1 left-1">
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 bg-black/60 text-white border-0"
                        >
                          {photo.photo_type === "before"
                            ? t("detail.before")
                            : t("detail.after")}
                        </Badge>
                      </div>
                    )}
                  </a>
                ) : null
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
