"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Users,
  Camera,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Ban,
  LogIn,
  LogOut,
  Activity,
  Loader2,
  Navigation,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { updateTaskStatus } from "@/actions/tasks/actions";
import { checkIn, checkOut } from "@/actions/check-ins/actions";
import { uploadTaskPhoto, deleteTaskPhoto } from "@/actions/photos/actions";
import type { ServiceType, TaskStatus, PhotoType } from "@/types";
import type { CompanyContext } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

const STATUS_META: Record<
  TaskStatus,
  { icon: React.ElementType; color: string; bg: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", variant: "outline" },
  scheduled: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", variant: "secondary" },
  in_progress: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", variant: "default" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", variant: "outline" },
  cancelled: { icon: Ban, color: "text-destructive", bg: "bg-destructive/10", variant: "destructive" },
};

const ACTIVITY_ACTION_KEYS = [
  "created",
  "updated",
  "assigned",
  "check_in",
  "check_out",
  "photo_uploaded",
  "status_changed",
  "deleted",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTask = any;

interface TaskDetailViewProps {
  slug: string;
  task: AnyTask;
  ctx: CompanyContext;
  signedUrls: Record<string, string>;
  activityLogs: AnyTask[];
  openCheckInId: string | null;
  canWrite: boolean;
  canUploadPhoto: boolean;
}

export function TaskDetailView({
  slug,
  task,
  ctx,
  signedUrls,
  activityLogs,
  openCheckInId,
  canWrite,
  canUploadPhoto,
}: TaskDetailViewProps) {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const locale = useLocale();
  const dateLocale = LOCALE_MAP[locale] ?? locale;

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>("before");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);

  const addr = Array.isArray(task.address) ? task.address[0] : task.address;
  const client = Array.isArray(addr?.client) ? addr.client[0] : addr?.client;
  const assignments: AnyTask[] = Array.isArray(task.assignments) ? task.assignments : [];
  const photos: AnyTask[] = Array.isArray(task.photos) ? task.photos : [];
  const checkIns: AnyTask[] = Array.isArray(task.check_ins) ? task.check_ins : [];
  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");
  const mapsRouteUrl = addr
    ? addr.latitude && addr.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${addr.street ?? ""} ${addr.house_number ?? ""}, ${addr.postal_code ?? ""} ${addr.city ?? ""}`,
        )}`
    : null;

  const meta = STATUS_META[task.status as TaskStatus] ?? STATUS_META.draft;
  const statusLabel = tStatus(task.status as TaskStatus);
  const priorityLabel = tStatus(`priorities.${task.priority}` as "priorities.low");
  const priorityColor = {
    low: "text-muted-foreground",
    normal: "text-foreground",
    high: "text-amber-600",
    urgent: "text-destructive",
  }[task.priority as string] ?? "text-foreground";

  async function handleStatusChange(status: TaskStatus) {
    const result = await updateTaskStatus(slug, task.id, status);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("statusUpdated"));
  }

  function fetchGeoForDialog() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoCoords({ lat, lng });
        const addrLat = addr?.latitude;
        const addrLng = addr?.longitude;
        if (addrLat && addrLng) {
          const R = 6_371_000;
          const dLat = ((addrLat - lat) * Math.PI) / 180;
          const dLon = ((addrLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((addrLat * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          setGeoDistance(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        }
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  function formatDistance() {
    if (geoDistance === null) return t("checkIn.locationCaptured");
    if (geoDistance < 1000) {
      return t("checkIn.distanceMeters", { distance: Math.round(geoDistance) });
    }
    return t("checkIn.distanceKm", { distance: (geoDistance / 1000).toFixed(1) });
  }

  async function handleCheckInOut() {
    if (!openCheckInId && geoDistance !== null && geoDistance > 1000) {
      toast.error(tToasts("tooFarForCheckIn"));
      return;
    }

    setCheckInLoading(true);
    const geo = geoCoords
      ? { latitude: geoCoords.lat, longitude: geoCoords.lng }
      : {};

    const result = openCheckInId
      ? await checkOut(slug, openCheckInId, { ...geo, notes: checkInNotes || undefined })
      : await checkIn(slug, task.id, { ...geo, notes: checkInNotes || undefined });

    setCheckInLoading(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(openCheckInId ? tToasts("checkedOut") : tToasts("checkedIn"));
    setCheckInOpen(false);
    setCheckInNotes("");
    setGeoCoords(null);
    setGeoDistance(null);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("photoType", photoType);
    if (openCheckInId) fd.append("checkInId", openCheckInId);

    const result = await uploadTaskPhoto(slug, task.id, fd);
    setPhotoLoading(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(tToasts("photoUploaded"));
    setPhotoOpen(false);
    e.target.value = "";
  }

  async function handleDeletePhoto() {
    if (!deletePhotoId) return;
    const result = await deleteTaskPhoto(slug, deletePhotoId);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("photoDeleted"));
    setDeletePhotoId(null);
  }

  function formatDuration(checkInAt: string, checkOutAt: string | null) {
    if (!checkOutAt) return t("checkIn.stillActive");
    const diff = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0
      ? t("checkIn.durationHours", { hours: h, minutes: m })
      : t("checkIn.durationMinutes", { minutes: m });
  }

  function activityActionLabel(action: string) {
    if (ACTIVITY_ACTION_KEYS.includes(action as typeof ACTIVITY_ACTION_KEYS[number])) {
      return t(`detail.activityActions.${action as typeof ACTIVITY_ACTION_KEYS[number]}`);
    }
    return action;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href={`/${slug}/tasks`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <ArrowLeft className="size-4" />
          {t("detail.backToTasks")}
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${meta.bg} ${meta.color} shrink-0`}>
            <meta.icon className="size-4" />
            {statusLabel}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {task.scheduled_start && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {task.scheduled_start}
              {task.scheduled_end && ` – ${task.scheduled_end}`}
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            {tServiceTypes(task.service_type as ServiceType)}
          </Badge>
          <span className={`font-medium text-xs ${priorityColor}`}>{priorityLabel}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ctx.employee && ["scheduled", "in_progress"].includes(task.status) && (
          <Button
            size="sm"
            variant={openCheckInId ? "outline" : "default"}
            onClick={() => setCheckInOpen(true)}
            className={openCheckInId ? "border-amber-300 text-amber-700 hover:bg-amber-50" : ""}
          >
            {openCheckInId ? <LogOut className="size-3.5" /> : <LogIn className="size-3.5" />}
            {openCheckInId ? t("checkIn.checkOut") : t("checkIn.checkIn")}
          </Button>
        )}

        {canUploadPhoto && task.status === "in_progress" && (
          <Button size="sm" variant="outline" onClick={() => setPhotoOpen(true)}>
            <Camera className="size-3.5" />
            {t("detail.takePhoto")}
          </Button>
        )}
        {mapsRouteUrl && (
          <a href={mapsRouteUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <Navigation className="size-3.5" />
              {t("detail.route")}
            </Button>
          </a>
        )}

        {canWrite && (
          <>
            {task.status === "scheduled" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("in_progress")}>
                <AlertCircle className="size-3.5" />
                {t("actions.start")}
              </Button>
            )}
            {task.status === "in_progress" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("completed")}>
                <CheckCircle2 className="size-3.5" />
                {t("actions.complete")}
              </Button>
            )}
          </>
        )}
      </div>

      <Separator />

      {addr && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="size-4 text-muted-foreground" />
            {t("detail.serviceObject")}
          </h2>
          <div className="rounded-xl border p-4 space-y-1.5 text-sm">
            {client && (
              <p className="font-medium">{client.name}</p>
            )}
            <p>
              {addr.street} {addr.house_number}, {addr.postal_code} {addr.city}
            </p>
            {addr.access_notes && (
              <p className="text-muted-foreground text-xs border-t pt-2 mt-2">
                <span className="font-medium">{t("detail.access")}</span> {addr.access_notes}
              </p>
            )}
          </div>
        </section>
      )}

      {task.description && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">{t("form.description")}</h2>
          <p className="text-sm text-muted-foreground rounded-xl border p-4">
            {task.description}
          </p>
        </section>
      )}

      {assignments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            {t("detail.assignedEmployees", { count: assignments.length })}
          </h2>
          <div className="space-y-1.5">
            {assignments.map((a: AnyTask) => {
              const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {(emp?.full_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{emp?.full_name ?? tCommon("notAvailable")}</p>
                    {emp?.phone && (
                      <p className="text-xs text-muted-foreground">{emp.phone}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {checkIns.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" />
            {t("checkIn.history")}
          </h2>
          <div className="space-y-2">
            {checkIns.map((ci: AnyTask) => {
              const emp = Array.isArray(ci.employee) ? ci.employee[0] : ci.employee;
              const isOpen = !ci.check_out_at;
              return (
                <div
                  key={ci.id}
                  className={`rounded-xl border p-3 text-sm space-y-1.5 ${isOpen ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{emp?.full_name ?? tCommon("notAvailable")}</span>
                    <Badge
                      variant={isOpen ? "default" : "outline"}
                      className={`text-xs ${isOpen ? "bg-amber-100 text-amber-700 border-amber-200" : ""}`}
                    >
                      {isOpen ? t("checkIn.active") : formatDuration(ci.check_in_at, ci.check_out_at)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{t("checkIn.in")}</span>{" "}
                      {new Date(ci.check_in_at).toLocaleString(dateLocale, {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {ci.check_out_at && (
                      <span>
                        <span className="font-medium text-foreground">{t("checkIn.out")}</span>{" "}
                        {new Date(ci.check_out_at).toLocaleString(dateLocale, {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    )}
                    {ci.check_in_latitude && (
                      <span>
                        GPS: {ci.check_in_latitude.toFixed(4)}, {ci.check_in_longitude?.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {ci.check_in_notes && (
                    <p className="text-xs text-muted-foreground border-t pt-1.5">
                      {ci.check_in_notes}
                    </p>
                  )}
                  {ci.check_out_notes && (
                    <p className="text-xs text-muted-foreground">
                      {t("checkIn.completion")} {ci.check_out_notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-1.5">
          <ImageIcon className="size-4 text-muted-foreground" />
          {t("detail.photosCount", { count: photos.length })}
        </h2>

        {photos.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Camera className="mx-auto size-8 mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("detail.noPhotos")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { type: "before" as PhotoType, label: t("detail.before"), photos: beforePhotos },
              { type: "after" as PhotoType, label: t("detail.after"), photos: afterPhotos },
            ].map(({ type, label, photos: typedPhotos }) =>
              typedPhotos.length > 0 ? (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {typedPhotos.map((photo: AnyTask) => {
                      const url = signedUrls[photo.storage_path];
                      return (
                        <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={photo.file_name ?? t("detail.photoAlt")}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="size-8 text-muted-foreground/40" />
                            </div>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => setDeletePhotoId(photo.id)}
                              className="absolute top-1 right-1 size-6 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm px-1.5 py-1 text-xs text-muted-foreground truncate">
                            {new Date(photo.uploaded_at).toLocaleDateString(dateLocale)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </section>

      {activityLogs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <Activity className="size-4 text-muted-foreground" />
            {t("detail.activities")}
          </h2>
          <div className="space-y-0 border rounded-xl overflow-hidden">
            {activityLogs.map((log: AnyTask, i: number) => {
              const profile = Array.isArray(log.profile) ? log.profile[0] : log.profile;
              const isLast = i === activityLogs.length - 1;
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${!isLast ? "border-b" : ""} hover:bg-muted/30 transition-colors`}
                >
                  <div className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">
                      {activityActionLabel(log.action)}
                    </span>
                    {log.metadata && typeof log.metadata === "object" && "from" in log.metadata && (
                      <span className="text-muted-foreground">
                        {t("detail.statusChangeFrom", {
                          from: log.metadata.from as string,
                          to: log.metadata.to as string,
                        })}
                      </span>
                    )}
                    {profile?.full_name && (
                      <span className="text-muted-foreground"> · {profile.full_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleString(dateLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Dialog open={checkInOpen} onOpenChange={(v) => {
        setCheckInOpen(v);
        if (v) { setGeoCoords(null); setGeoDistance(null); fetchGeoForDialog(); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {openCheckInId ? t("checkIn.checkOut") : t("checkIn.checkIn")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
              geoDistance !== null && geoDistance > 1000
                ? "border-destructive/40 bg-destructive/5"
                : geoDistance !== null && geoDistance > 300
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                  : ""
            }`}>
              {geoLoading ? (
                <><Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" /><span className="text-muted-foreground text-xs">{t("checkIn.locating")}</span></>
              ) : geoCoords ? (
                <>
                  {geoDistance !== null && geoDistance > 1000
                    ? <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                    : geoDistance !== null && geoDistance > 300
                      ? <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                      : <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  }
                  <span className={`text-xs ${
                    geoDistance !== null && geoDistance > 1000 ? "text-destructive" :
                    geoDistance !== null && geoDistance > 300 ? "text-amber-700" : "text-emerald-700"
                  }`}>
                    {formatDistance()}
                  </span>
                </>
              ) : (
                <><Navigation className="size-3.5 text-muted-foreground shrink-0" /><span className="text-muted-foreground text-xs">{t("checkIn.gpsUnavailable")}</span></>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {openCheckInId ? t("checkIn.confirmEnd") : t("checkIn.confirmStart")}
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">{t("checkIn.notes")}</Label>
              <Textarea
                rows={3}
                placeholder={openCheckInId ? t("checkIn.whatDone") : t("checkIn.startNotes")}
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleCheckInOut}
              disabled={
                checkInLoading ||
                geoLoading ||
                (!openCheckInId && geoDistance !== null && geoDistance > 1000)
              }
            >
              {checkInLoading && <Loader2 className="animate-spin" />}
              {openCheckInId ? t("checkIn.checkOut") : t("checkIn.checkIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("detail.takePhoto")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["before", "after"] as PhotoType[]).map((photoTypeOption) => (
                <button
                  key={photoTypeOption}
                  onClick={() => setPhotoType(photoTypeOption)}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    photoType === photoTypeOption
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {photoTypeOption === "before" ? t("detail.before") : t("detail.after")}
                </button>
              ))}
            </div>

            <label className="block">
              <div className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 ${photoLoading ? "opacity-50 pointer-events-none" : ""}`}>
                {photoLoading ? (
                  <Loader2 className="size-8 animate-spin text-primary" />
                ) : (
                  <>
                    <Camera className="size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {t("detail.takeOrSelect")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.fileTypes")}
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handlePhotoUpload}
                  disabled={photoLoading}
                />
              </div>
            </label>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePhotoId}
        onOpenChange={(o) => !o && setDeletePhotoId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.deletePhotoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.deletePhotoDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto}>{tCommon("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
