// Handlers de Web Push — importados pelo service worker gerado pelo vite-plugin-pwa.
/* eslint-disable no-undef */
self.addEventListener('push', (event) => {
  let titulo = 'SINDPRF-CE';
  let corpo = 'Nova notícia publicada';
  let url = '/noticias';

  try {
    if (event.data) {
      const data = event.data.json();
      if (typeof data.titulo === 'string') titulo = data.titulo;
      if (typeof data.corpo === 'string') corpo = data.corpo;
      if (typeof data.url === 'string') url = data.url;
    }
  } catch {
    const texto = event.data?.text();
    if (texto) corpo = texto;
  }

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data: { url },
      tag: 'noticia',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || '/noticias';
  const url = new URL(destino, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const cliente of clientes) {
        if ('focus' in cliente && 'navigate' in cliente) {
          void cliente.focus();
          return cliente.navigate(url);
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
