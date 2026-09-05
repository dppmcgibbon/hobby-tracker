const CACHE_NAME = "hobby-tracker-v3";
const urlsToCache = ["/offline"];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests, API routes, auth, and dynamic dashboard pages
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/auth")
  ) {
    return;
  }

  // Network first for other requests, cache static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache static assets (logos, images, next static chunks)
        if (
          response.status === 200 &&
          (url.pathname.startsWith("/_next/static/") ||
            url.pathname.startsWith("/logos/") ||
            url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || (event.request.mode === "navigate" ? caches.match("/offline") : null);
        });
      })
  );
});
