"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, LogIn, LogOut, Loader2, Navigation } from "lucide-react";
import { checkIn, checkOut } from "@/actions/check-ins/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

/** Haversine distance in meters between two lat/lng points */
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface CheckInButtonProps {
  slug: string;
  taskId: string;
  openCheckInId?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
}

export function CheckInButton({
  slug,
  taskId,
  openCheckInId,
  addressLat,
  addressLng,
}: CheckInButtonProps) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const isCheckedIn = !!openCheckInId;

  async function getLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
    if (!navigator.geolocation) return undefined;
    setGeoLoading(true);
    try {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCoords({ lat, lng });
            if (addressLat && addressLng) {
              setDistance(haversineMeters(lat, lng, addressLat, addressLng));
            }
            resolve({ latitude: lat, longitude: lng });
          },
          () => resolve(undefined),
          { timeout: 8000, enableHighAccuracy: true },
        );
      });
    } finally {
      setGeoLoading(false);
    }
  }

  const distanceWarning = distance !== null && distance > 300 && distance <= 1000;
  const distanceFar = distance !== null && distance > 1000;

  async function handleSubmit() {
    setLoading(true);
    const geo = await getLocation();
    try {
      let result;
      if (isCheckedIn && openCheckInId) {
        result = await checkOut(slug, openCheckInId, {
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          notes: notes || undefined,
        });
      } else {
        result = await checkIn(slug, taskId, {
          latitude: geo?.latitude,
          longitude: geo?.longitude,
          notes: notes || undefined,
        });
      }

      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(isCheckedIn ? tToasts("checkedOut") : tToasts("checkedIn"));
        setOpen(false);
        setNotes("");
        setCoords(null);
      }
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    setCoords(null);
    setDistance(null);
    getLocation();
  }

  function formatDistance() {
    if (distance === null) return t("checkIn.locationCaptured");
    if (distance < 1000) {
      return t("checkIn.distanceMeters", { distance: Math.round(distance) });
    }
    return t("checkIn.distanceKm", { distance: (distance / 1000).toFixed(1) });
  }

  return (
    <>
      <Button
        size="sm"
        variant={isCheckedIn ? "outline" : "default"}
        onClick={openDialog}
        className={isCheckedIn ? "border-amber-300 text-amber-700 hover:bg-amber-50" : ""}
      >
        {isCheckedIn ? (
          <>
            <LogOut className="size-3.5" />
            {t("checkIn.checkOut")}
          </>
        ) : (
          <>
            <LogIn className="size-3.5" />
            {t("checkIn.checkIn")}
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isCheckedIn ? t("checkIn.confirmCheckOut") : t("checkIn.confirmCheckIn")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className={`flex items-start gap-2 text-sm rounded-lg border p-3 ${
              distanceFar
                ? "border-destructive/40 bg-destructive/5"
                : distanceWarning
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                  : "text-muted-foreground"
            }`}>
              {geoLoading ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin mt-0.5" />
                  <span>{t("checkIn.locating")}</span>
                </>
              ) : coords ? (
                <>
                  {distanceFar ? (
                    <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
                  ) : distanceWarning ? (
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className={
                      distanceFar ? "text-destructive font-medium" :
                      distanceWarning ? "text-amber-700 font-medium" :
                      "text-emerald-700"
                    }>
                      {formatDistance()}
                    </p>
                    {distanceFar && (
                      <p className="text-xs text-destructive/80">
                        {t("checkIn.notAtSite")}
                      </p>
                    )}
                    {distanceWarning && (
                      <p className="text-xs text-amber-700/80">
                        {t("checkIn.somewhatFar")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Navigation className="size-4 shrink-0 mt-0.5" />
                  <span>{t("checkIn.gpsNoAccess")}</span>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ci-notes">{t("checkIn.notesOptional")}</Label>
              <Textarea
                id="ci-notes"
                placeholder={
                  isCheckedIn
                    ? t("checkIn.whatDone")
                    : t("checkIn.startNotes")
                }
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || geoLoading}
              variant={isCheckedIn ? "outline" : "default"}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isCheckedIn ? (
                <LogOut />
              ) : (
                <LogIn />
              )}
              {isCheckedIn ? t("checkIn.checkOut") : t("checkIn.checkIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
