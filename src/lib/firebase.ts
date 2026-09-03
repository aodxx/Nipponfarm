import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer, enableNetwork, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
const requiredEnv = (name: string, value: string | undefined): string => {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const firebaseConfig = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: requiredEnv('VITE_FIREBASE_STORAGE_BUCKET', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: requiredEnv('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID || undefined,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
// Standard Firestore initialization with forced polling for stable proxy traversal
const isIframe = typeof window !== 'undefined' && window.self !== window.top;

// Safely initialize Analytics to support ad-blockers and sandbox iframes where GA requests are blocked
let analyticsInstance = null;
if (typeof window !== 'undefined' && !isIframe) {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (error) {
    console.info('Firebase Analytics is omitted or blocked in this environment:', error);
  }
}

export const analytics = analyticsInstance;

// Fail-safe Firestore initialization
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ...(isIframe ? {} : { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.info('Firestore is already initialized, falling back to getFirestore:', error);
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const storage = getStorage(app);
