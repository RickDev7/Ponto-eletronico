"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInit() {
  const t = useTranslations("employee.mobile.pwa");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => void registration.unregister());
        });
        if ("caches" in window) {
          void caches.keys().then((keys) => {
            keys.forEach((key) => void caches.delete(key));
          });
        }
        return;
      }

      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => { /* SW optional */ });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const dismissed = sessionStorage.getItem("pwa-dismissed");
      if (!dismissed) {
        setInstallPrompt(e as BeforeInstallPromptEvent);
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border bg-background/95 p-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Download className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("installTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("installDescription")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("installAction")}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
