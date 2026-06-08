const CACHE_NAME = "guri-dagan-v2";

// Only pre-cache the offline fallback — never cache SSR/auth routes
const STATIC_ASSETS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Guri Dagan";
  const options = {
    body: data.body || "Time to post — your community is waiting.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/today" },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the app at Today
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Never intercept API calls
  if (event.request.url.includes("/api/")) return;

  // PAGE NAVIGATIONS: pass straight to network, no caching.
  // SSR pages are auth-sensitive — caching them causes stale redirects
  // and broken auth state after login (old /today cache → redirects to /login).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/offline").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // STATIC ASSETS (JS, CSS, fonts, images): cache-first for speed
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => new Response("", { status: 503 }))
  );
});
