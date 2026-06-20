import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceType, TaskStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clients");
  return { title: t("detail.pageTitle") };
}

interface PageProps {
  params: Promise<{ companySlug: string; clientId: string }>;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  draft: "text-muted-foreground",
  scheduled: "text-blue-600",
  in_progress: "text-amber-600",
  completed: "text-emerald-600",
  cancelled: "text-destructive",
};

export default async function ClientDetailPage({ params }: PageProps) {
  const { companySlug, clientId } = await params;
  const [t, tNav, tStatus, tServiceTypes, locale] = await Promise.all([
    getTranslations("clients"),
    getTranslations("navigation"),
    getTranslations("status"),
    getTranslations("serviceTypes"),
    getLocale(),
  ]);
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!client) notFound();

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("client_id", clientId)
    .eq("company_id", ctx.company.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const addressIds = (addresses ?? []).map((a) => a.id);
  let clientTasks: {
    id: string;
    title: string;
    status: string;
    service_type: string;
    scheduled_date: string;
    priority: string;
    address: unknown;
  }[] = [];

  if (addressIds.length > 0) {
    const { data } = await supabase
      .from("tasks")
      .select(`
        id, title, status, service_type, scheduled_date, priority,
        address:addresses(street, house_number, city)
      `)
      .eq("company_id", ctx.company.id)
      .in("address_id", addressIds)
      .order("scheduled_date", { ascending: false })
      .limit(30);
    clientTasks = data ?? [];
  }

  const completedCount = (clientTasks ?? []).filter((t) => t.status === "completed").length;
  const activeCount = (clientTasks ?? []).filter(
    (t) => t.status === "scheduled" || t.status === "in_progress",
  ).length;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link
        href={`/${companySlug}/clients`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {tNav("clients")}
      </Link>

      <div className="flex items-start gap-4">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
          <Building2 className="size-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">{client.name}</h1>
              {client.tax_id && (
                <p className="text-xs font-mono text-muted-foreground">
                  {client.tax_id}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={client.status === "active" ? "text-emerald-600 border-emerald-200" : ""}
            >
              {client.status === "active"
                ? t("status.active")
                : t("status.inactive")}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" />
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" />
                {client.phone}
              </span>
            )}
            {client.address && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {client.address}
              </span>
            )}
          </div>
          {client.notes && (
            <p className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              {client.notes}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("detail.stats.properties"), value: (addresses ?? []).length, icon: MapPin },
          { label: t("detail.stats.activeTasks"), value: activeCount, icon: AlertCircle },
          { label: t("detail.stats.completed"), value: completedCount, icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <s.icon className="size-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            {t("detail.propertiesHeading", { count: (addresses ?? []).length })}
          </h2>
          <Link
            href={`/${companySlug}/clients`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="size-3" />
            {t("detail.add")}
          </Link>
        </div>
        {(addresses ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            {t("detail.noProperties")}
          </p>
        ) : (
          <div className="space-y-2">
            {(addresses ?? []).map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border p-3 space-y-1"
              >
                <p className="text-sm font-medium">
                  {addr.street} {addr.house_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {addr.postal_code} {addr.city}
                  {addr.floor && ` · ${t("detail.floorSuffix", { floor: addr.floor })}`}
                  {addr.unit && ` · ${addr.unit}`}
                </p>
                {addr.access_notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1 mt-1">
                    🔑 {addr.access_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {(clientTasks ?? []).length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              {t("detail.tasksHeading", { count: (clientTasks ?? []).length })}
            </h2>
            <div className="space-y-1.5">
              {(clientTasks ?? []).map((task) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const addr = Array.isArray(task.address) ? task.address[0] : task.address as any;
                const status = task.status as TaskStatus;
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
                        {addr?.city && ` · ${addr.city}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
                          day: "2-digit", month: "2-digit", year: "2-digit",
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
          </section>
        </>
      )}
    </div>
  );
}
