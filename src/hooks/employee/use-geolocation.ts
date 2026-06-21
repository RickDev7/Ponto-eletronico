"use client";

import { useCallback, useEffect, useState } from "react";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

type GeoStatus = "idle" | "loading" | "ready" | "denied" | "unsupported";

export function useGeolocation(options?: { watch?: boolean }) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [position, setPosition] = useState<GeoPosition | null>(null);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    );
  }, []);

  useEffect(() => {
    refresh();
    if (!options?.watch || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [options?.watch, refresh]);

  return { status, position, refresh };
}
