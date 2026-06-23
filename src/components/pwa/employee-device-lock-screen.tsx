"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Fingerprint, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useDeviceLock } from "@/hooks/employee/use-device-lock";
import { canUseBiometricUnlock } from "@/lib/pwa/device-lock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;

export function EmployeeDeviceLockScreen() {
  const t = useTranslations("employee.mobile.deviceLock");
  const { locked, lockEnabled, biometricEnabled, unlockWithPin, unlockWithBiometric } =
    useDeviceLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void canUseBiometricUnlock().then(setBioAvailable);
  }, []);

  if (!locked || !lockEnabled) return null;

  function appendDigit(digit: string) {
    if (pending) return;
    setError(false);
    if (digit === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!digit || pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    if (next.length >= 4) {
      startTransition(async () => {
        const ok = await unlockWithPin(next);
        if (!ok) {
          setError(true);
          setPin("");
        }
      });
    }
  }

  function handleBiometric() {
    startTransition(async () => {
      const ok = await unlockWithBiometric();
      if (!ok) toast.error(t("biometricFailed"));
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="size-8 text-primary" />
      </div>
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "size-3 rounded-full border-2 transition-colors",
              i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/30",
              error && "border-destructive",
            )}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{t("wrongPin")}</p>}

      <div className="mt-8 grid w-full max-w-[240px] grid-cols-3 gap-2">
        {PIN_KEYS.map((key, index) =>
          key === "" ? (
            <div key={`spacer-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              disabled={pending}
              onClick={() => appendDigit(key)}
              className="flex h-14 items-center justify-center rounded-2xl bg-muted/60 text-lg font-medium transition-colors hover:bg-muted active:scale-95"
            >
              {key}
            </button>
          ),
        )}
      </div>

      {biometricEnabled && bioAvailable && (
        <Button
          type="button"
          variant="outline"
          className="mt-6 h-11 gap-2 rounded-full"
          disabled={pending}
          onClick={handleBiometric}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
          {t("useBiometric")}
        </Button>
      )}
    </div>
  );
}
