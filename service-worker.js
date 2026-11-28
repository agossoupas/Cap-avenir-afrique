const CACHE_NAME = "cap-avenir-afrique-v12";
const APP_SHELL = [
  "./",
  "./index.html",
  "./emplois.html",
  "./favoris.html",
  "./bourses.html",
  "./formation.html",
  "./conseils.html",
  "./contact.html",
  "./espace-candidat.html",
  "./confidentialite.html",
  "./mentions-legales.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./app-icon.svg",
  "./cap-avenir-afrique-favicon.png",
  "./cap-avenir-afrique-theme-bleu-nuit-or.css",
  "./refonte.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("cap-avenir-afrique-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("./offline.html");
        })
    );
    return;
  }

  // Les ressources déjà en cache s'affichent immédiatement, tout en étant
  // actualisées en arrière-plan lorsqu'une connexion est disponible.
  const cachedResponse = caches.match(request);
  const networkUpdate = fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      return caches.open(CACHE_NAME)
        .then(cache => cache.put(request, copy))
        .then(() => response);
    }
    return response;
  });

  event.waitUntil(networkUpdate.then(() => undefined).catch(() => undefined));
  event.respondWith(
    cachedResponse.then(cached => cached || networkUpdate)
      .catch(() => new Response("Ressource indisponible hors connexion.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }))
  );
});
