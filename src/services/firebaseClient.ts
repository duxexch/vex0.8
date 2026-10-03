import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeFirestore, getFirestore, Firestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';

// Suppress benign internal network/offline timeout notices in sandboxed/iframe preview
setLogLevel('silent');

const firebaseConfig = {
  apiKey: "AIzaSyD4D7-axkkEw1e-2A7Tq_UkGPGum0UQ2tY",
  authDomain: "ceremonial-ivy-3f6jr.firebaseapp.com",
  projectId: "ceremonial-ivy-3f6jr",
  storageBucket: "ceremonial-ivy-3f6jr.firebasestorage.app",
  messagingSenderId: "710426700225",
  appId: "1:710426700225:web:7003397cf3285f8a79a740"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const DATABASE_ID = "ai-studio-vexdealsloyaltyc-80c64da8-d188-40a0-9aa8-964641cb4988";

export const db: Firestore = (() => {
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
        },
        DATABASE_ID
      );
    } catch {
      return getFirestore(app, DATABASE_ID);
    }
  }
  return getFirestore(app, DATABASE_ID);
})();

// Verify connection with graceful timeout race as per skill instructions
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const checkPromise = getDocFromServer(doc(db, 'test', 'connection'));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection check timeout')), 4000)
      );
      await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firestore is operating in offline mode:', error.message);
      }
    }
  })();
}

let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('Firebase Messaging not supported in this environment:', e);
}

export { app, messaging };

export async function requestFCMToken(): Promise<string | null> {
  try {
    if (!messaging) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}
