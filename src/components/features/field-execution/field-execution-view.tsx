"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Navigation,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { checkIn, checkOut } from "@/actions/check-ins/actions";
import { uploadTaskPhoto } from "@/actions/photos/actions";
import { signServiceReportAction, openServiceReportAction } from "@/actions/field-execution/actions";
import { ROUTES } from "@/config/constants";
import type { ExecutionContext } from "@/lib/field-execution/field-execution-types";
import { TaskChecklist } from "@/components/features/tasks/task-checklist";
import { SignaturePad } from "@/components/features/field-execution/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOfflineFieldActions } from "@/hooks/employee/use-offline-field-actions";
import { ChecklistConflictPanel } from "@/components/features/field-execution/checklist-conflict-panel";
import {
  AppDarkHeader,
  AppCard,
  AppScreen,
  AppSegmentTabs,
} from "@/components/mobile/app";

type Step = "checkin" | "checklist" | "photos" | "sign" | "checkout";

interface FieldExecutionViewProps {
  slug: string;
  taskId: string;
  context: ExecutionContext;
  variant?: "field" | "mobile";
  /** Mobile execute flow — skips check-in step (handled on /mobile/check-in). */
  mode?: "full" | "execute";
  offlineSupport?: {
    enabled: boolean;
    checkInId?: string;
    localSessionKey?: string;
  };
}

async function getGeo() {
  try {
    return await new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 8000, enableHighAccuracy: true },
      );
    });
  } catch {
    return {};
  }
}

export function FieldExecutionView({
  slug,
  taskId,
  context,
  variant = "field",
  mode = "full",
  offlineSupport,
}: FieldExecutionViewProps) {
  const t = useTranslations("fieldExecution");
  const tPwa = useTranslations("employee.mobile.pwa");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isMobileExecute = variant === "mobile" && mode === "execute";
  const offlineEnabled = offlineSupport?.enabled ?? false;
  const offlineActions = useOfflineFieldActions({
    slug,
    taskId,
    checkInId: offlineSupport?.checkInId ?? context.openCheckIn?.id,
    localSessionKey: offlineSupport?.localSessionKey,
  });
  const scheduleHref =
    variant === "mobile"
      ? isMobileExecute
        ? ROUTES.mobileService(slug, taskId)
        : ROUTES.mobileSchedule(slug)
      : ROUTES.fieldSchedule(slug);
  const homeAfterCheckout =
    variant === "mobile" ? ROUTES.mobile(slug) : scheduleHref;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(context.openCheckIn ? "checklist" : "checkin");
  const [notes, setNotes] = useState("");
  const [photoType, setPhotoType] = useState<"before" | "after" | "evidence">("before");
  const [clientName, setClientName] = useState(context.serviceReport?.client_name ?? "");
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const { task, openCheckIn, serviceReport } = context;
  const addr = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = addr?.client ? (Array.isArray(addr.client) ? addr.client[0] : addr.client) : null;

  const allSteps: Step[] = ["checkin", "checklist", "photos", "sign", "checkout"];
  const steps: Step[] = isMobileExecute
    ? allSteps.filter((s) => s !== "checkin")
    : allSteps;
  const stepIndex = steps.indexOf(step);

  async function handleCheckInOut() {
    setGeoLoading(true);
    const geo = await getGeo();
    setGeoLoading(false);

    startTransition(async () => {
      if (openCheckIn) {
        const isOfflineSession = openCheckIn.id.startsWith("offline:");

        if (isOfflineSession || !navigator.onLine) {
          await offlineActions.enqueueCheckOut({ ...geo, notes: notes || undefined });
          toast.success(tPwa("actionQueued"));
          router.push(homeAfterCheckout);
          return;
        }

        const status = await offlineActions.tryOnlineOrEnqueue(
          () => checkOut(slug, openCheckIn.id, { ...geo, notes: notes || undefined }),
          () => offlineActions.enqueueCheckOut({ ...geo, notes: notes || undefined }),
        );

        if (status === "failed") {
          toast.error(tCommon("error"));
          return;
        }
        if (status === "queued") {
          toast.success(tPwa("actionQueued"));
          router.push(homeAfterCheckout);
          return;
        }

        toast.success(t("checkout.done"));
        router.refresh();
        router.push(homeAfterCheckout);
        return;
      }

      const result = await checkIn(slug, taskId, { ...geo, notes: notes || undefined });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("checkin.done"));
      setStep("checklist");
      router.refresh();
    });
  }

  function handlePhotoUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !openCheckIn) return;

    startTransition(async () => {
      const isOfflineSession = openCheckIn.id.startsWith("offline:");

      const uploadOnline = async () => {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("photoType", photoType);
        if (!isOfflineSession) fd.set("checkInId", openCheckIn.id);
        return uploadTaskPhoto(slug, taskId, fd);
      };

      if (offlineEnabled && (isOfflineSession || !navigator.onLine)) {
        await offlineActions.enqueuePhoto(file, photoType);
        toast.success(tPwa("actionQueued"));
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      if (offlineEnabled) {
        const status = await offlineActions.tryOnlineOrEnqueue(
          uploadOnline,
          () => offlineActions.enqueuePhoto(file, photoType),
        );
        if (status === "failed") {
          toast.error(tCommon("error"));
          return;
        }
        if (status === "queued") toast.success(tPwa("actionQueued"));
        else toast.success(t("photos.uploaded"));
      } else {
        const result = await uploadOnline();
        if (result.success) toast.success(t("photos.uploaded"));
        else toast.error(result.error);
      }

      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function handleSign() {
    if (!clientName.trim() || !signatureBlob || !openCheckIn) {
      toast.error(t("sign.required"));
      return;
    }

    startTransition(async () => {
      const isOfflineSession = openCheckIn.id.startsWith("offline:");

      const signOnline = async () => {
        const fd = new FormData();
        fd.set("clientName", clientName.trim());
        if (!isOfflineSession) fd.set("checkInId", openCheckIn.id);
        fd.set("signature", new File([signatureBlob], "signature.png", { type: "image/png" }));
        return signServiceReportAction(slug, taskId, fd);
      };

      if (offlineEnabled && (isOfflineSession || !navigator.onLine)) {
        await offlineActions.enqueueSign(clientName.trim(), signatureBlob);
        toast.success(tPwa("actionQueued"));
        return;
      }

      if (offlineEnabled) {
        const status = await offlineActions.tryOnlineOrEnqueue(
          signOnline,
          () => offlineActions.enqueueSign(clientName.trim(), signatureBlob),
        );
        if (status === "failed") {
          toast.error(tCommon("error"));
          return;
        }
        if (status === "queued") toast.success(tPwa("actionQueued"));
        else toast.success(t("sign.done"));
      } else {
        const result = await signOnline();
        if (result.success) toast.success(t("sign.done"));
        else toast.error(result.error);
      }

      router.refresh();
    });
  }

  function openReport() {
    if (!serviceReport?.id) return;
    startTransition(async () => {
      const result = await openServiceReportAction(slug, serviceReport.id);
      if (result.success) window.open(result.data.url, "_blank");
      else toast.error(result.error);
    });
  }

  return (
    <AppScreen immersive className={cn("space-y-0 px-0 pt-0", isMobileExecute ? "pb-28" : "pb-28")}>
      {isMobileExecute ? (
        <AppDarkHeader
          title={task.title}
          subtitle={addr ? `${addr.street}, ${addr.city}` : task.scheduled_date}
          backHref={scheduleHref}
          progress={stepIndex + 1}
          total={steps.length}
        />
      ) : (
        <div className="flex items-center gap-2 px-[var(--mobile-page-px)] pt-4">
          <Link
            href={scheduleHref}
            className="mobile-touch-target mobile-pressable inline-flex items-center justify-center rounded-full border border-[var(--mobile-border)]"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{task.title}</h1>
            <p className="truncate text-sm text-[var(--mobile-secondary)]">
              {addr ? `${addr.street}, ${addr.city}` : task.scheduled_date}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 px-[var(--mobile-page-px)] pt-4">
      {isMobileExecute && (
        <AppSegmentTabs
          value={step}
          onChange={(s) => openCheckIn && setStep(s as Step)}
          options={steps.map((s) => ({ key: s, label: t(`steps.${s}`) }))}
        />
      )}

      {!isMobileExecute && (
      <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={!openCheckIn && s !== "checkin"}
            onClick={() => openCheckIn && setStep(s)}
            className={cn(
              "mobile-touch-target mobile-pressable shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              i <= stepIndex && openCheckIn && "ring-1 ring-primary/20",
            )}
          >
            {t(`steps.${s}`)}
          </button>
        ))}
      </nav>
      )}

      {step === "checkin" && !isMobileExecute && (
        <section className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LogIn className="size-4 text-primary" />
            {openCheckIn ? t("checkin.active") : t("checkin.title")}
          </div>
          {client?.name && (
            <p className="text-sm text-muted-foreground">{t("checkin.client")}: {client.name}</p>
          )}
          <div>
            <Label className="text-xs">{t("checkin.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 text-sm"
              placeholder={t("checkin.notesPlaceholder")}
            />
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={pending || geoLoading}
            onClick={handleCheckInOut}
          >
            {(pending || geoLoading) && <Loader2 className="mr-2 size-4 animate-spin" />}
            <Navigation className="mr-2 size-4" />
            {openCheckIn ? t("checkout.action") : t("checkin.action")}
          </Button>
        </section>
      )}

      {step === "checklist" && openCheckIn && (
        <section className="space-y-3">
          {offlineEnabled && (
            <ChecklistConflictPanel
              slug={slug}
              taskId={taskId}
              serverItems={context.checklist}
              onResolved={() => router.refresh()}
            />
          )}
          <div className="rounded-2xl border bg-card p-4">
            <TaskChecklist
            slug={slug}
            taskId={taskId}
            items={context.checklist}
            canEdit={false}
            offlineSupport={
              offlineEnabled
                ? {
                    onToggleOffline: async (itemId, checked) => {
                      await offlineActions.enqueueChecklistToggle(itemId, checked);
                      toast.success(tPwa("actionQueued"));
                    },
                  }
                : undefined
            }
          />
          </div>
        </section>
      )}

      {step === "photos" && openCheckIn && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex gap-2">
            {(["before", "after", "evidence"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPhotoType(type)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs font-medium",
                  photoType === type ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground",
                )}
              >
                {t(`photos.${type}`)}
              </button>
            ))}
          </div>
          <Input ref={fileRef} type="file" accept="image/*" capture="environment" className="text-sm" />
          <Button className="w-full" disabled={pending} onClick={handlePhotoUpload}>
            <Camera className="mr-2 size-4" />
            {t("photos.upload")}
          </Button>
          {context.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {context.photos.map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-lg border">
                  {p.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.signedUrl} alt={p.photo_type} className="aspect-square w-full object-cover" />
                  )}
                  <figcaption className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">
                    {p.photo_type}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {step === "sign" && openCheckIn && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <Label className="text-xs">{t("sign.clientName")}</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1" />
          </div>
          <SignaturePad onChange={setSignatureBlob} />
          <Button className="h-11 w-full" disabled={pending} onClick={handleSign}>
            {serviceReport?.signed_at ? (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                {t("sign.alreadySigned")}
              </>
            ) : (
              t("sign.action")
            )}
          </Button>
        </section>
      )}

      {step === "checkout" && openCheckIn && (
        <section className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LogOut className="size-4 text-amber-600" />
            {t("checkout.title")}
          </div>
          <p className="text-sm text-muted-foreground">{t("checkout.hint")}</p>
          <div>
            <Label className="text-xs">{t("checkout.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 text-sm"
            />
          </div>
          <Button
            variant="destructive"
            className="h-12 w-full text-base"
            disabled={pending || geoLoading}
            onClick={handleCheckInOut}
          >
            {(pending || geoLoading) && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("checkout.action")}
          </Button>
          {serviceReport?.generated_at && (
            <Button variant="outline" className="w-full" disabled={pending} onClick={openReport}>
              <FileText className="mr-2 size-4" />
              {t("report.open")}
            </Button>
          )}
        </section>
      )}

      {openCheckIn && step !== "checkin" && (
        <div
          className={cn(
            "fixed left-0 right-0 z-30 border-t bg-background/95 p-3 backdrop-blur-sm safe-area-pb",
            variant === "mobile" ? "bottom-0" : "bottom-16 lg:hidden",
          )}
        >
          <div className="mx-auto flex max-w-lg gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" className="mobile-touch-target h-12 flex-1 rounded-xl text-base" onClick={() => setStep(steps[stepIndex - 1]!)}>
                {t("nav.back")}
              </Button>
            )}
            {stepIndex < steps.length - 1 && (
              <Button className="mobile-touch-target h-12 flex-1 rounded-xl text-base" onClick={() => setStep(steps[stepIndex + 1]!)}>
                {t("nav.next")}
              </Button>
            )}
          </div>
        </div>
      )}
      </div>
    </AppScreen>
  );
}
