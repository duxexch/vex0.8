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

// Fetch handler — required by some Chromium versions for PWA installability
// checks. Pass-through: requests keep their default network behavior (no
// caching layer, so no stale-app risks).
self.addEventListener('fetch', () => {});

// =========================================================================
// Category merge ("نفس الدومين") — when MORE THAN 3 notifications pile up
// for the SAME category while still on screen, they collapse into ONE
// grouped card: "📩 N إشعارات جديدة — <التصنيف>" with the latest
// notification as a preview.
//
//   • 1st–3rd of a batch show individually (unchanged look).
//   • The 4th closes the batch and shows the grouped card (count = 4).
//   • 5th+ updates the grouped card's count (same tag → replaces it).
//   • The counter lives in each notification's `data` — it survives service
//     worker restarts because state is read back from getNotifications().
//   • Dismissing notifications resets the batch (they no longer count).
// =========================================================================

const MERGE_LIMIT = 3;

const CATEGORY_LABELS = {
  ar: {
    ai_prediction: 'توقعات ذكية',
    sports_news: 'أخبار رياضة',
    compensation: 'تعويضات',
    transfer: 'تحويلات',
    security: 'تنبيه أمان',
    system: 'النظام',
    lottery: 'اليانصيب',
    general: 'إشعارات',
  },
  en: {
    ai_prediction: 'AI predictions',
    sports_news: 'Sports news',
    compensation: 'Compensation',
    transfer: 'Transfers',
    security: 'Security alert',
    system: 'System',
    lottery: 'Lottery',
    general: 'Notifications',
  },
};

/** Category from the payload, else derived from the push tag. */
function resolveCategory(explicit, tag) {
  const c = String(explicit || '').trim();
  if (c) return c;
  const t = String(tag || '');
  if (t.indexOf('pred-') === 0) return 'ai_prediction';
  if (t.indexOf('lottery-') === 0) return 'lottery';
  if (t === 'broadcast') return 'system';
  return '';
}

/** Arabic subscribers get the AR copy, everyone else gets EN. */
function isArabic(lang) {
  return String(lang || 'ar').toLowerCase().indexOf('ar') === 0;
}

function truncate(s, n) {
  const str = String(s || '').replace(/\s+/g, ' ').trim();
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

/**
 * Single delivery path for BOTH FCM background messages and self-hosted
 * Web Push — applies the same-category merge rule before showing anything.
 */
async function deliverNotification(opts) {
  const category = opts.category || '';
  const ar = isArabic(opts.lang);
  const icon = opts.icon || '/icon-192.png';
  const url = opts.url || '/#ai-sports';
  const preview = truncate(opts.title, 160) || truncate(opts.body, 160);

  if (!category) {
    // Unknown category → behave exactly as before (no merging).
    return self.registration.showNotification(opts.title || 'VEX Deals', {
      body: opts.body || '',
      icon,
      badge: '/icon-192.png',
      ...(opts.image ? { image: opts.image } : {}),
      ...(opts.tag ? { tag: opts.tag } : {}),
      data: { url },
    });
  }

  // Visible notifications of this category — their `data` holds the counter.
  const visible = await self.registration.getNotifications();
  const same = visible.filter((n) => n.data && n.data.category === category);
  let sum = 0;
  same.forEach((n) => {
    sum += Number(n.data.count) || 1;
  });
  const total = sum + 1;

  if (total > MERGE_LIMIT) {
    // More than 3 for the same domain → collapse the batch into one card.
    same.forEach((n) => n.close());
    const labels = CATEGORY_LABELS[ar ? 'ar' : 'en'] || CATEGORY_LABELS.en;
    const label = labels[category] || labels.general;
    const title = ar
      ? `📩 ${total} إشعارات جديدة — ${label}`
      : `📩 ${total} new notifications — ${label}`;
    const body = ar ? `آخر إشعار: ${preview}` : `Latest: ${preview}`;
    return self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      ...(opts.image ? { image: opts.image } : {}),
      tag: `vex-cat-${category}`,
      data: { url, category, count: total },
    });
  }

  // 1st–3rd of the batch → individual card (original tag keeps its dedup).
  return self.registration.showNotification(opts.title || 'VEX Deals', {
    body: opts.body || '',
    icon,
    badge: '/icon-192.png',
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.tag ? { tag: opts.tag } : {}),
    data: { url, category, count: 1 },
  });
}

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const data = payload.data || {};
  // FCM is used for compensation updates — category defaults accordingly,
  // but a payload-provided category/tag always wins.
  return deliverNotification({
    category: resolveCategory(data.category, data.tag) || 'compensation',
    lang: data.lang,
    title: payload.notification?.title || data.title || 'Compensation Status Update',
    body: payload.notification?.body || data.body || 'Your compensation request status has been updated.',
    url: data.url || data.actionUrl || '/#ai-sports',
    image: payload.notification?.image,
    tag: data.tag,
    icon: '/icon-192.png',
  });
});

// Self-hosted Web Push (VAPID from /api/push/vapid-public-key) — predictions,
// settlements, lottery & broadcasts. Payload: { title, body, url, tag,
// category, lang, image }.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'VEX Deals', body: event.data.text() };
  }
  const tag = data.tag || 'vex-push';
  event.waitUntil(
    deliverNotification({
      category: resolveCategory(data.category, tag),
      lang: data.lang,
      title: data.title || 'VEX Deals',
      body: data.body || '',
      url: data.url || '/#ai-sports',
      image: data.image,
      tag,
      icon: String(tag).indexOf('lottery') === 0 ? '/lottery-192.png' : '/icon-192.png',
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
