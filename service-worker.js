const CACHE_NAME = "cap-avenir-afrique-v18";
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
  "./push-setup.html",
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

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (_) { payload = { body: event.data ? event.data.text() : "" }; }
  const title = payload.title || "Cap Avenir Afrique";
  const options = {
    body: payload.body || "Une nouvelle opportunité pourrait t'intéresser.",
    icon: "./app-icon.svg",
    badge: "./cap-avenir-afrique-favicon.png",
    data: { url: payload.url || "./espace-candidat.html" },
    tag: payload.tag || "cap-avenir-afrique",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./espace-candidat.html", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if (new URL(client.url).origin === self.location.origin) {
        client.navigate(target.href);
        return client.focus();
      }
    }
    return clients.openWindow(target.href);
  }));
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
