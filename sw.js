const CACHE_NAME = 'les3-menu-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo_les3.png',
  './background.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Instalar el Service Worker y cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cacheando archivos estáticos');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Forzar que el SW entre en control inmediatamente
  self.skipWaiting();
});

// Activar el SW y limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Borrando cache antigua', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Reclamar clientes inmediatamente
  return self.clients.claim();
});

// Estrategia de Cache-First con Stale-While-Revalidate para mayor velocidad
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar la respuesta cacheada pero actualizarla en segundo plano (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse);
          });
        }).catch(() => {
          // Si falla la red, no pasa nada, ya servimos la cache
        });
        return cachedResponse;
      }

      // Si no está en cache, ir a la red
      return fetch(event.request).then((networkResponse) => {
        // Cachear nuevas peticiones exitosas a activos propios o CDN
        if (networkResponse.ok && (
             event.request.url.includes(self.location.origin) || 
             event.request.url.includes('cdn.jsdelivr.net')
           )) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Aquí podrías retornar un fallback offline si fuera necesario
      });
    })
  );
});
