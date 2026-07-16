const CACHE_NAME = 'geotagseditor-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/about/',
  '/about/index.html',
  '/contact/',
  '/contact/index.html',
  '/features/',
  '/features/index.html',
  '/geo-tag-editor/',
  '/geo-tag-editor/index.html',
  '/add-gps-to-photo-online/',
  '/add-gps-to-photo-online/index.html',
  '/remove-geotag-from-photo-online/',
  '/remove-geotag-from-photo-online/index.html',
  '/css/style.css',
  '/css/mobile.css',
  '/css/landing.css',
  '/js/common.js',
  '/js/site.js',
  '/js/tool.js',
  '/vendor/leaflet-1.9.4.css',
  '/vendor/leaflet-1.9.4.js',
  '/vendor/piexifjs-1.0.6.js',
  '/images/logo.webp',
  '/favicon.ico',
  '/site.webmanifest'
];

// Install Service Worker and cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interception - Cache First, fallback to Network
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS schemes (exclude chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache new static assets dynamically if needed (optional, skip OSM tiles to avoid bloating)
        const url = event.request.url;
        const isHTML = event.request.headers.get('accept')?.includes('text/html');
        const isStaticAsset = url.includes('/css/') || url.includes('/js/') || url.includes('/images/') || url.includes('/vendor/');
        
        if (networkResponse.status === 200 && (isHTML || isStaticAsset) && !url.includes('google-analytics') && !url.includes('clarity.ms') && !url.includes('pagead2')) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
