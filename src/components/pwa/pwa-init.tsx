"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInit() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => { /* SW optional */ });
    }

    // Capture install prompt
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl border bg-background/95 backdrop-blur-sm shadow-lg p-3.5">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">App installieren</p>
          <p className="text-xs text-muted-foreground">
            FeldOps zum Startbildschirm hinzufügen
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Installieren
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
