"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { checkIn } from "@/actions/check-ins/actions";
import { ROUTES } from "@/config/constants";
import {
  enqueueOfflineAction,
  isLikelyNetworkError,
  registerBackgroundSync,
} from "@/lib/pwa/offline-queue";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { GPS_CHECK_IN_RADIUS_M, formatDistance, haversineMeters } from "@/lib/employee/gps";
import { useGeolocation } from "@/hooks/employee/use-geolocation";
import { ServiceMap } from "@/components/employee/service-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EmployeeCheckInViewProps {
  slug: string;
  taskId: string;
  context: ExecutionContext;
}

export function EmployeeCheckInView({ slug, taskId, context }: EmployeeCheckInViewProps) {
  const t = useTranslations("employee.mobile.checkIn");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const { status: geoStatus, position, refresh } = useGeolocation({ watch: true });

  const { task, openCheckIn } = context;
  const addr = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = addr?.client
    ? Array.isArray(addr.client)
      ? addr.client[0]
      : addr.client
    : null;
  const clientName = client?.name ?? null;

  const destLat = addr?.latitude ?? null;
  const destLng = addr?.longitude ?? null;
  const requiresGps = destLat != null && destLng != null;

  const distanceM =
    position && destLat != null && destLng != null
      ? haversineMeters(position.latitude, position.longitude, destLat, destLng)
      : null;

  const inRange = distanceM == null || distanceM <= GPS_CHECK_IN_RADIUS_M;
  const geoOk =
    !requiresGps || (geoStatus === "ready" && position != null && inRange);
  const canSubmit = !openCheckIn && !pending && geoStatus !== "loading" && geoOk;

  async function performCheckIn() {
    const payload = {
      latitude: position?.latitude,
      longitude: position?.longitude,
      notes: notes || undefined,
    };

    if (!navigator.onLine) {
      await enqueueOfflineAction({ type: "check_in", slug, taskId, payload });
      await registerBackgroundSync();
      toast.success(t("offlineQueued"));
      return;
    }

    const result = await checkIn(slug, taskId, payload);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("success"));
    router.push(ROUTES.mobileServiceExecute(slug, taskId));
    router.refresh();
  }

  function handleCheckIn() {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        await performCheckIn();
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          await enqueueOfflineAction({
            type: "check_in",
            slug,
            taskId,
            payload: {
              latitude: position?.latitude,
              longitude: position?.longitude,
              notes: notes || undefined,
            },
          });
          await registerBackgroundSync();
          toast.success(t("offlineQueued"));
        } else {
          toast.error(t("failed"));
        }
      }
    });
  }

  if (openCheckIn) {
    return (
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Link
            href={ROUTES.mobileService(slug, taskId)}
            className="inline-flex size-9 items-center justify-center rounded-full border"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{task.title}</p>
            <p className="text-xs text-emerald-600">{t("alreadyActive")}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <p className="text-sm text-muted-foreground">{t("continueHint")}</p>
          <Button asChild className="h-12 w-full max-w-sm">
            <Link href={ROUTES.mobileServiceExecute(slug, taskId)}>{t("continueExecution")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Link
          href={ROUTES.mobileService(slug, taskId)}
          className="inline-flex size-9 items-center justify-center rounded-full border"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{task.title}</p>
          <p className="text-xs text-muted-foreground">{t("title")}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        <ServiceMap latitude={destLat} longitude={destLng} height={220} className="shadow-sm" />

        <div className="space-y-2 rounded-2xl border bg-card p-4">
          {clientName && <p className="text-sm font-medium">{clientName}</p>}
          {addr && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {addr.street}
              {addr.house_number ? ` ${addr.house_number}` : ""}, {addr.city}
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            {new Date(`${task.scheduled_date}T12:00:00`).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        <GpsStatusCard
          geoStatus={geoStatus}
          distanceM={distanceM}
          inRange={inRange}
          requiresGps={requiresGps}
          onRefresh={refresh}
          t={t}
        />

        <div>
          <Label className="text-xs">{tCommon("notesOptional")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1.5 text-sm"
            placeholder={t("notesPlaceholder")}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-4 backdrop-blur-sm">
        <Button
          className="h-14 w-full text-base font-semibold"
          disabled={!canSubmit}
          onClick={handleCheckIn}
        >
          {(pending || geoStatus === "loading") && <Loader2 className="mr-2 size-5 animate-spin" />}
          <Navigation className="mr-2 size-5" />
          {t("action")}
        </Button>
      </div>
    </div>
  );
}

function GpsStatusCard({
  geoStatus,
  distanceM,
  inRange,
  requiresGps,
  onRefresh,
  t,
}: {
  geoStatus: string;
  distanceM: number | null;
  inRange: boolean;
  requiresGps: boolean;
  onRefresh: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        requiresGps && distanceM != null && !inRange && "border-amber-500/40 bg-amber-500/5",
        requiresGps && distanceM != null && inRange && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GPS</p>
          <p className="mt-1 text-sm font-medium">
            {geoStatus === "loading" && t("gpsLoading")}
            {geoStatus === "denied" && t("gpsDenied")}
            {geoStatus === "unsupported" && t("gpsUnsupported")}
            {geoStatus === "ready" && distanceM != null && (
              <>
                {formatDistance(distanceM)} {t("fromSite")}
              </>
            )}
            {geoStatus === "ready" && distanceM == null && t("gpsReady")}
            {geoStatus === "idle" && t("gpsLoading")}
          </p>
          {requiresGps && distanceM != null && !inRange && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("tooFar")}</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onRefresh}>
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
