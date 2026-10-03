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
