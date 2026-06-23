/* eslint-disable no-restricted-globals */
/** FeldOps Employee PWA — Service Worker v5 */

const SHELL_CACHE = "feldops-shell-v5";
const RUNTIME_CACHE = "feldops-runtime-v5";
const SYNC_TAG = "employee-offline-sync";

const SHELL_URLS = ["/offline", "/icons/employee-192.svg", "/icons/employee-512.svg"];

function isMobileAppPath(pathname) {
  return /\/mobile(\/|$)/.test(pathname);
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(pathname)
  );
}

async function staleWhileRevalidate(cache, request) {
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      if (isMobileAppPath(new URL(request.url).pathname)) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match("/offline"));
    return (
      cached ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol === "chrome-extension:") return;
  if (url.hostname.includes("supabase.co")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) => staleWhileRevalidate(cache, request)),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notifyClientsToSync());
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "FeldOps", body: "", url: "/", data: {} };
  try {
    payload = { ...payload, ...(event.data?.json() ?? {}) };
  } catch {
    payload.body = event.data?.text() ?? "";
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/employee-192.svg",
      badge: "/icons/employee-192.svg",
      tag: payload.tag ?? "feldops-notification",
      data: { url: payload.url, ...payload.data },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_OFFLINE_QUEUE" });
  }
}
