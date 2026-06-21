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

type Step = "checkin" | "checklist" | "photos" | "sign" | "checkout";

interface FieldExecutionViewProps {
  slug: string;
  taskId: string;
  context: ExecutionContext;
  variant?: "field" | "mobile";
  /** Mobile execute flow — skips check-in step (handled on /mobile/check-in). */
  mode?: "full" | "execute";
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
}: FieldExecutionViewProps) {
  const t = useTranslations("fieldExecution");
  const router = useRouter();
  const isMobileExecute = variant === "mobile" && mode === "execute";
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
      const result = openCheckIn
        ? await checkOut(slug, openCheckIn.id, { ...geo, notes: notes || undefined })
        : await checkIn(slug, taskId, { ...geo, notes: notes || undefined });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (openCheckIn) {
        toast.success(t("checkout.done"));
        router.refresh();
        router.push(homeAfterCheckout);
      } else {
        toast.success(t("checkin.done"));
        setStep("checklist");
        router.refresh();
      }
    });
  }

  function handlePhotoUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("photoType", photoType);
    if (openCheckIn) fd.set("checkInId", openCheckIn.id);

    startTransition(async () => {
      const result = await uploadTaskPhoto(slug, taskId, fd);
      if (result.success) {
        toast.success(t("photos.uploaded"));
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleSign() {
    if (!clientName.trim() || !signatureBlob || !openCheckIn) {
      toast.error(t("sign.required"));
      return;
    }
    const fd = new FormData();
    fd.set("clientName", clientName.trim());
    fd.set("checkInId", openCheckIn.id);
    fd.set("signature", new File([signatureBlob], "signature.png", { type: "image/png" }));

    startTransition(async () => {
      const result = await signServiceReportAction(slug, taskId, fd);
      if (result.success) {
        toast.success(t("sign.done"));
        router.refresh();
      } else toast.error(result.error);
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
    <div className="mx-auto max-w-lg space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <Link
          href={scheduleHref}
          className="inline-flex size-9 items-center justify-center rounded-full border"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{task.title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {addr ? `${addr.street}, ${addr.city}` : task.scheduled_date}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={!openCheckIn && s !== "checkin"}
            onClick={() => openCheckIn && setStep(s)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              i <= stepIndex && openCheckIn && "ring-1 ring-primary/20",
            )}
          >
            {t(`steps.${s}`)}
          </button>
        ))}
      </nav>

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
        <section className="rounded-2xl border bg-card p-4">
          <TaskChecklist slug={slug} taskId={taskId} items={context.checklist} canEdit={false} />
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
            "fixed left-0 right-0 z-30 border-t bg-background/95 p-3 backdrop-blur-sm",
            variant === "mobile" ? "bottom-0" : "bottom-16 lg:hidden",
          )}
        >
          <div className="mx-auto flex max-w-lg gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(steps[stepIndex - 1]!)}>
                {t("nav.back")}
              </Button>
            )}
            {stepIndex < steps.length - 1 && (
              <Button className="flex-1" onClick={() => setStep(steps[stepIndex + 1]!)}>
                {t("nav.next")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
