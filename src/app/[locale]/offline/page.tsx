"use client";

import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  const t = useTranslations("employee.mobile.pwa");

  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          <WifiOff className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">{t("offlinePageTitle")}</h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          {t("offlinePageDescription")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t("offlinePageRetry")}
        </button>
      </div>
    </div>
  );
}
