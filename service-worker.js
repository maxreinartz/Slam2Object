self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("slam2object-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/app.js",
        "/manifest.json",
        "/icon.png",
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
