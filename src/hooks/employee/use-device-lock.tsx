"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  isDeviceLockEnabled,
  loadDeviceLockConfig,
  verifyDeviceBiometric,
  verifyDevicePin,
} from "@/lib/pwa/device-lock";

const IDLE_LOCK_MS = 5 * 60 * 1000;

interface DeviceLockContextValue {
  locked: boolean;
  lockEnabled: boolean;
  biometricEnabled: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lockNow: () => void;
  refreshConfig: () => Promise<void>;
}

const DeviceLockContext = createContext<DeviceLockContextValue | null>(null);

export function useDeviceLock() {
  const ctx = useContext(DeviceLockContext);
  if (!ctx) throw new Error("useDeviceLock must be used within DeviceLockProvider");
  return ctx;
}

interface DeviceLockProviderProps {
  slug: string;
  employeeId: string;
  children: React.ReactNode;
}

export function DeviceLockProvider({ slug, employeeId, children }: DeviceLockProviderProps) {
  const [locked, setLocked] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockedRef = useRef(false);

  const refreshConfig = useCallback(async () => {
    const enabled = await isDeviceLockEnabled(slug, employeeId);
    const config = await loadDeviceLockConfig(slug, employeeId);
    setLockEnabled(enabled);
    setBiometricEnabled(Boolean(config?.biometricEnabled));
  }, [slug, employeeId]);

  const lockNow = useCallback(() => {
    if (!lockEnabled) return;
    lockedRef.current = true;
    setLocked(true);
  }, [lockEnabled]);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (lockedRef.current) return;
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      const ok = await verifyDevicePin(slug, employeeId, pin);
      if (ok) {
        lockedRef.current = false;
        setLocked(false);
        lastActivityRef.current = Date.now();
      }
      return ok;
    },
    [slug, employeeId],
  );

  const unlockWithBiometric = useCallback(async () => {
    const ok = await verifyDeviceBiometric(slug, employeeId);
    if (ok) {
      lockedRef.current = false;
      setLocked(false);
      lastActivityRef.current = Date.now();
    }
    return ok;
  }, [slug, employeeId]);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    if (!lockEnabled) return;

    const onActivity = () => touchActivity();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_LOCK_MS) {
        lockNow();
      }
    }, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        lockNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [lockEnabled, lockNow, touchActivity]);

  return (
    <DeviceLockContext.Provider
      value={{
        locked,
        lockEnabled,
        biometricEnabled,
        unlockWithPin,
        unlockWithBiometric,
        lockNow,
        refreshConfig,
      }}
    >
      {children}
    </DeviceLockContext.Provider>
  );
}
