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
        "/icon.png",
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
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
