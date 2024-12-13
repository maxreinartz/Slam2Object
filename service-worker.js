self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("slam2object-cache").then(async (cache) => {
      // Cache main files
      await cache.addAll([
        "/",
        "/index.html",
        "/app.js",
        "/style.css",
        "/manifest.json",
        "/assets/icon.jpg",
        "/assets/FOT-ModeMinALargeStd-R.otf",
      ]);

      // Cache entire directories
      const directories = ["/assets/img/", "/assets/sfx/"];
      for (const dir of directories) {
        const response = await fetch(dir);
        const files = await response.text();
        const matches = files.match(/href="([^"]+)"/g) || [];
        const dirFiles = matches
          .map((match) => match.match(/href="([^"]+)"/)[1])
          .filter((file) => !file.endsWith("/"))
          .map((file) => dir + file);
        await cache.addAll(dirFiles);
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // Try network, fallback to cache if offline
        return fetch(event.request)
          .catch(() => {
            // If network fails and we don't have a cache, return a fallback
            if (event.request.url.includes('/assets/')) {
              return new Response('Resource temporarily unavailable', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
              });
            }
            // Return cached version of index.html for navigation requests
            return caches.match('/index.html');
          });
      })
  );
});

// Add offline event handling
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if needed
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== 'slam2object-cache')
            .map(cacheName => caches.delete(cacheName))
        );
      })
    ])
  );
});
