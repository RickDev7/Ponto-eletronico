"use client";

import { useTranslations } from "next-intl";
import { CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBadgeProps {
  offline: boolean;
  pendingCount: number;
  syncing: boolean;
  className?: string;
}

export function OfflineBadge({ offline, pendingCount, syncing, className }: OfflineBadgeProps) {
  const t = useTranslations("employee.mobile.pwa");

  if (!offline && pendingCount === 0 && !syncing) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-4 py-2 text-xs",
        offline
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-primary/20 bg-primary/5 text-primary",
        className,
      )}
    >
      {syncing ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <CloudOff className="size-3.5 shrink-0" />
      )}
      <span>
        {syncing
          ? t("syncing")
          : offline
            ? pendingCount > 0
              ? t("offlinePending", { count: pendingCount })
              : t("offline")
            : t("pendingSync", { count: pendingCount })}
      </span>
    </div>
  );
}
