importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD4D7-axkkEw1e-2A7Tq_UkGPGum0UQ2tY",
  authDomain: "ceremonial-ivy-3f6jr.firebaseapp.com",
  projectId: "ceremonial-ivy-3f6jr",
  storageBucket: "ceremonial-ivy-3f6jr.firebasestorage.app",
  messagingSenderId: "710426700225",
  appId: "1:710426700225:web:7003397cf3285f8a79a740"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Compensation Status Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Your compensation request status has been updated.',
    icon: '/icon-192.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Self-hosted Web Push (VAPID from /api/push/vapid-public-key) — predictions & settlements
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'VEX Deals', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VEX Deals', {
      body: data.body || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: data.tag || 'vex-push',
      data: { url: data.url || '/#ai-sports' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/#ai-sports';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
