const CACHE_NAME = "guri-dagan-v4";

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

  // STATIC ASSETS (JS, CSS, fonts, images): stale-while-revalidate — serve
  // the cached copy instantly if there is one, but always also fetch a fresh
  // copy in the background and update the cache. A pure cache-first strategy
  // here meant any edit to a CSS/JS file could get stuck being served forever
  // (Next dev-mode chunk filenames aren't uniquely hashed per change like a
  // production build), with no way for a browser to self-heal short of a
  // manual CACHE_NAME bump + hard refresh. This version still serves fast,
  // but the next load always picks up whatever actually changed.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => null);
        return cached || network || new Response("", { status: 503 });
      })
    )
  );
});
