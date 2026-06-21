"use client";

import { useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import { buildMapsRouteUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface ServiceMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label?: string;
  className?: string;
  height?: number;
}

function osmEmbedUrl(lat: number, lng: number) {
  const pad = 0.012;
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function ServiceMap({
  latitude,
  longitude,
  label,
  className,
  height = 200,
}: ServiceMapProps) {
  const t = useTranslations("employee.mobile.service");

  const mapsUrl =
    latitude != null && longitude != null
      ? buildMapsRouteUrl({ latitude, longitude })
      : null;

  if (latitude == null || longitude == null) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-center",
          className,
        )}
        style={{ minHeight: height }}
      >
        <MapPin className="mb-2 size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{t("mapUnavailable")}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/60 bg-muted/20", className)}>
      <iframe
        title={label ?? t("mapTitle")}
        src={osmEmbedUrl(latitude, longitude)}
        className="w-full border-0"
        style={{ height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border-t border-border/60 bg-card py-2.5 text-xs font-medium text-primary hover:bg-muted/40"
        >
          <Navigation className="size-3.5" />
          {t("openNavigation")}
        </a>
      )}
    </div>
  );
}
