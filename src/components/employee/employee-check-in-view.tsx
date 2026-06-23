"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
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
import { offlineCacheKey, saveOfflineCache } from "@/lib/pwa/offline-cache";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { GPS_CHECK_IN_RADIUS_M, formatDistance, haversineMeters } from "@/lib/employee/gps";
import { useGeolocation } from "@/hooks/employee/use-geolocation";
import { ServiceMap } from "@/components/employee/service-map";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AppCard,
  AppDarkHeader,
  AppScreen,
  AppButton,
} from "@/components/mobile/app";

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

  async function queueOfflineCheckIn() {
    const localSessionKey = crypto.randomUUID();
    const payload = {
      latitude: position?.latitude,
      longitude: position?.longitude,
      notes: notes || undefined,
      localSessionKey,
    };

    await enqueueOfflineAction({
      type: "check_in",
      slug,
      taskId,
      payload,
      sessionKey: localSessionKey,
    });
    await registerBackgroundSync();

    const executionCache = {
      ...context,
      openCheckIn: {
        id: `offline:${localSessionKey}`,
        check_in_at: new Date().toISOString(),
        check_in_notes: notes || null,
      },
    };
    await saveOfflineCache(offlineCacheKey("execution", slug, taskId), executionCache);

    toast.success(t("offlineQueued"));
    router.push(ROUTES.mobileServiceExecute(slug, taskId));
  }

  async function performCheckIn() {
    if (!navigator.onLine) {
      await queueOfflineCheckIn();
      return;
    }

    const payload = {
      latitude: position?.latitude,
      longitude: position?.longitude,
      notes: notes || undefined,
      localSessionKey: crypto.randomUUID(),
    };

    const result = await checkIn(slug, taskId, {
      latitude: payload.latitude,
      longitude: payload.longitude,
      notes: payload.notes,
    });
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
          await queueOfflineCheckIn();
        } else {
          toast.error(t("failed"));
        }
      }
    });
  }

  if (openCheckIn) {
    return (
      <AppScreen immersive className="flex min-h-svh flex-col justify-center text-center">
        <AppDarkHeader
          title={task.title}
          subtitle={t("alreadyActive")}
          backHref={ROUTES.mobileService(slug, taskId)}
        />
        <CheckCircle2 className="mx-auto size-16 text-[var(--mobile-success)]" />
        <p className="mt-4 px-6 text-base text-[var(--mobile-secondary)]">{t("continueHint")}</p>
        <Link
          href={ROUTES.mobileServiceExecute(slug, taskId)}
          className="mobile-pressable mx-auto mt-8 flex h-[52px] w-[min(100%,20rem)] items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] px-6 font-semibold text-white"
        >
          <Navigation className="size-5" />
          {t("continueExecution")}
        </Link>
      </AppScreen>
    );
  }

  return (
    <>
      <AppScreen immersive className="space-y-0 px-0 pt-0 pb-32">
        <AppDarkHeader
          title={clientName ?? task.title}
          subtitle={t("title")}
          backHref={ROUTES.mobileService(slug, taskId)}
        />
        <div className="space-y-5 px-[var(--mobile-page-px)] pt-4">
          <div className="overflow-hidden rounded-[var(--mobile-radius-card)] shadow-[var(--mobile-shadow-card)]">
            <ServiceMap latitude={destLat} longitude={destLng} height={220} />
          </div>

          <AppCard className="space-y-2">
            {clientName && <p className="font-semibold text-[var(--mobile-text)]">{clientName}</p>}
            {addr && (
              <p className="flex items-start gap-2 text-sm text-[var(--mobile-secondary)]">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {addr.street}
                {addr.house_number ? ` ${addr.house_number}` : ""}, {addr.city}
              </p>
            )}
            <p className="flex items-center gap-2 text-xs text-[var(--mobile-secondary)]">
              <Calendar className="size-3.5" />
              {new Date(`${task.scheduled_date}T12:00:00`).toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </AppCard>

          <GpsStatusCard
            geoStatus={geoStatus}
            distanceM={distanceM}
            inRange={inRange}
            requiresGps={requiresGps}
            onRefresh={refresh}
            t={t}
          />

          <div>
            <label className="text-sm font-medium text-[var(--mobile-text)]">{tCommon("notesOptional")}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 rounded-[var(--mobile-radius-button)] border-[var(--mobile-border)] text-base"
              placeholder={t("notesPlaceholder")}
            />
          </div>
        </div>
      </AppScreen>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mobile-border)] bg-[var(--mobile-card)]/95 p-4 backdrop-blur-xl safe-area-pb">
        <button
          type="button"
          className="mobile-pressable mx-auto flex h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-[var(--mobile-radius-button)] bg-[var(--mobile-primary)] text-base font-semibold text-white disabled:opacity-50"
          disabled={!canSubmit}
          onClick={handleCheckIn}
        >
          {(pending || geoStatus === "loading") && <Loader2 className="size-5 animate-spin" />}
          <Navigation className="size-5" />
          {t("action")}
        </button>
      </div>
    </>
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
