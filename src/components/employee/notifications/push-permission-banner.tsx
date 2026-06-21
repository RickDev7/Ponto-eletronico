"use client";

import { useTranslations } from "next-intl";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PushPermissionState } from "@/hooks/employee/use-push-subscription";

interface PushPermissionBannerProps {
  permission: PushPermissionState;
  subscribed: boolean;
  vapidConfigured: boolean;
  onEnable: () => Promise<{ ok: boolean; error?: string }>;
  pending?: boolean;
}

export function PushPermissionBanner({
  permission,
  subscribed,
  vapidConfigured,
  onEnable,
  pending,
}: PushPermissionBannerProps) {
  const t = useTranslations("employee.mobile.notifications");

  if (permission === "unsupported" || !vapidConfigured) return null;
  if (subscribed || permission === "denied") return null;

  return (
    <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <BellRing className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">{t("enablePushTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("enablePushDescription")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={pending}
          onClick={() => void onEnable()}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : t("enablePushAction")}
        </Button>
      </div>
    </div>
  );
}
