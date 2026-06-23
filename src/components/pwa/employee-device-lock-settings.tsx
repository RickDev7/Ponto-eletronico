"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import {
  canUseBiometricUnlock,
  disableDeviceBiometric,
  disableDeviceLock,
  isDeviceLockEnabled,
  loadDeviceLockConfig,
  registerDeviceBiometric,
  setDevicePin,
} from "@/lib/pwa/device-lock";
import { useDeviceLock } from "@/hooks/employee/use-device-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface EmployeeDeviceLockSettingsProps {
  slug: string;
  employeeId: string;
  displayName: string;
}

export function EmployeeDeviceLockSettings({
  slug,
  employeeId,
  displayName,
}: EmployeeDeviceLockSettingsProps) {
  const t = useTranslations("employee.mobile.deviceLock");
  const { refreshConfig, lockNow } = useDeviceLock();
  const [enabled, setEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      setEnabled(await isDeviceLockEnabled(slug, employeeId));
      const config = await loadDeviceLockConfig(slug, employeeId);
      setBiometricEnabled(Boolean(config?.biometricEnabled));
      setBioAvailable(await canUseBiometricUnlock());
    })();
  }, [slug, employeeId]);

  function handleEnablePin() {
    if (pin.length < 4 || pin.length > 6) {
      toast.error(t("pinLength"));
      return;
    }
    if (pin !== confirmPin) {
      toast.error(t("pinMismatch"));
      return;
    }
    startTransition(async () => {
      await setDevicePin(slug, employeeId, pin);
      setEnabled(true);
      setPin("");
      setConfirmPin("");
      await refreshConfig();
      toast.success(t("pinEnabled"));
    });
  }

  function handleDisable() {
    startTransition(async () => {
      await disableDeviceLock(slug, employeeId);
      setEnabled(false);
      setBiometricEnabled(false);
      await refreshConfig();
      toast.success(t("disabled"));
    });
  }

  function handleBiometricToggle(checked: boolean) {
    startTransition(async () => {
      if (checked) {
        const ok = await registerDeviceBiometric(slug, employeeId, displayName);
        if (!ok) {
          toast.error(t("biometricSetupFailed"));
          return;
        }
        setBiometricEnabled(true);
        toast.success(t("biometricEnabled"));
      } else {
        await disableDeviceBiometric(slug, employeeId);
        setBiometricEnabled(false);
        toast.success(t("biometricDisabled"));
      }
      await refreshConfig();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("settingsTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("settingsDescription")}</p>
        </div>
      </div>

      {!enabled ? (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("newPin")}</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
              placeholder="••••"
            />
          </div>
          <div>
            <Label className="text-xs">{t("confirmPin")}</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
              placeholder="••••"
            />
          </div>
          <Button className="w-full" disabled={pending} onClick={handleEnablePin}>
            <Lock className="mr-2 size-4" />
            {t("enablePin")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("pinActive")}</p>

          {bioAvailable && (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Fingerprint className="size-4 text-primary" />
                <span className="text-sm">{t("biometricLabel")}</span>
              </div>
              <Switch
                checked={biometricEnabled}
                disabled={pending}
                onCheckedChange={handleBiometricToggle}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={pending} onClick={() => lockNow()}>
              {t("lockNow")}
            </Button>
            <Button variant="destructive" className="flex-1" disabled={pending} onClick={handleDisable}>
              {t("disable")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
