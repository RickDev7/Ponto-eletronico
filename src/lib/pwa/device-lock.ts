import { DEVICE_LOCK_STORE, openOfflineDb } from "@/lib/pwa/offline-queue";

const PBKDF2_ITERATIONS = 120_000;

export interface DeviceLockConfig {
  key: string;
  enabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  credentialId?: string;
  biometricEnabled: boolean;
  updatedAt: string;
}

export function deviceLockKey(slug: string, employeeId: string) {
  return `lock:${slug}:${employeeId}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export async function loadDeviceLockConfig(
  slug: string,
  employeeId: string,
): Promise<DeviceLockConfig | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openOfflineDb();
  const key = deviceLockKey(slug, employeeId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DEVICE_LOCK_STORE, "readonly");
    const request = tx.objectStore(DEVICE_LOCK_STORE).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as DeviceLockConfig) ?? null);
  });
}

async function saveDeviceLockConfig(config: DeviceLockConfig): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DEVICE_LOCK_STORE, "readwrite");
    const request = tx.objectStore(DEVICE_LOCK_STORE).put(config);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function setDevicePin(
  slug: string,
  employeeId: string,
  pin: string,
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pinHash = await hashPin(pin, salt);
  const existing = await loadDeviceLockConfig(slug, employeeId);
  await saveDeviceLockConfig({
    key: deviceLockKey(slug, employeeId),
    enabled: true,
    pinHash,
    pinSalt: toBase64(salt),
    credentialId: existing?.credentialId,
    biometricEnabled: existing?.biometricEnabled ?? false,
    updatedAt: new Date().toISOString(),
  });
}

export async function verifyDevicePin(
  slug: string,
  employeeId: string,
  pin: string,
): Promise<boolean> {
  const config = await loadDeviceLockConfig(slug, employeeId);
  if (!config?.pinHash || !config.pinSalt) return false;
  const hash = await hashPin(pin, fromBase64(config.pinSalt));
  return hash === config.pinHash;
}

export async function disableDeviceLock(slug: string, employeeId: string): Promise<void> {
  const db = await openOfflineDb();
  const key = deviceLockKey(slug, employeeId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DEVICE_LOCK_STORE, "readwrite");
    const request = tx.objectStore(DEVICE_LOCK_STORE).delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function isBiometricAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof PublicKeyCredential !== "undefined" &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export async function canUseBiometricUnlock(): Promise<boolean> {
  if (!isBiometricAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerDeviceBiometric(
  slug: string,
  employeeId: string,
  displayName: string,
): Promise<boolean> {
  if (!(await canUseBiometricUnlock())) return false;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(employeeId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "FeldOps", id: window.location.hostname },
      user: {
        id: userId,
        name: `${displayName}@${slug}`,
        displayName,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) return false;

  const existing = await loadDeviceLockConfig(slug, employeeId);
  await saveDeviceLockConfig({
    key: deviceLockKey(slug, employeeId),
    enabled: existing?.enabled ?? Boolean(existing?.pinHash),
    pinHash: existing?.pinHash,
    pinSalt: existing?.pinSalt,
    credentialId: toBase64(new Uint8Array(credential.rawId)),
    biometricEnabled: true,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function verifyDeviceBiometric(
  slug: string,
  employeeId: string,
): Promise<boolean> {
  const config = await loadDeviceLockConfig(slug, employeeId);
  if (!config?.biometricEnabled || !config.credentialId) return false;

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: fromBase64(config.credentialId).buffer as ArrayBuffer,
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

export async function disableDeviceBiometric(slug: string, employeeId: string): Promise<void> {
  const config = await loadDeviceLockConfig(slug, employeeId);
  if (!config) return;
  await saveDeviceLockConfig({
    ...config,
    credentialId: undefined,
    biometricEnabled: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function isDeviceLockEnabled(slug: string, employeeId: string): Promise<boolean> {
  const config = await loadDeviceLockConfig(slug, employeeId);
  return Boolean(config?.enabled && config.pinHash);
}
