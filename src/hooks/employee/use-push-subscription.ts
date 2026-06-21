"use client";

import { useCallback, useEffect, useState } from "react";
import {
  registerPushSubscriptionAction,
  unregisterPushSubscriptionAction,
} from "@/actions/employee/notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied" | "loading";

export function usePushSubscription(slug: string) {
  const [permission, setPermission] = useState<PushPermissionState>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(false);

  const refreshState = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermissionState);

    try {
      const res = await fetch("/api/push/vapid-public-key");
      const data = (await res.json()) as { configured: boolean; publicKey: string | null };
      setVapidConfigured(Boolean(data.configured && data.publicKey));

      if (Notification.permission !== "granted") {
        setSubscribed(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const subscribe = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return { ok: false as const, error: "unsupported" };
    }

    const perm = await Notification.requestPermission();
    setPermission(perm as PushPermissionState);
    if (perm !== "granted") {
      return { ok: false as const, error: "denied" };
    }

    const keyRes = await fetch("/api/push/vapid-public-key");
    const keyData = (await keyRes.json()) as { configured: boolean; publicKey: string | null };
    if (!keyData.configured || !keyData.publicKey) {
      return { ok: false as const, error: "not_configured" };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false as const, error: "invalid_subscription" };
    }

    const result = await registerPushSubscriptionAction(
      slug,
      {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
      navigator.userAgent,
    );

    if (!result.success) {
      return { ok: false as const, error: result.error };
    }

    setSubscribed(true);
    return { ok: true as const };
  }, [slug]);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setSubscribed(false);
      return;
    }

    await unregisterPushSubscriptionAction(slug, subscription.endpoint);
    await subscription.unsubscribe();
    setSubscribed(false);
  }, [slug]);

  return {
    permission,
    subscribed,
    vapidConfigured,
    subscribe,
    unsubscribe,
    refreshState,
  };
}
