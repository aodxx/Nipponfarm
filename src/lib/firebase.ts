import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer, enableNetwork, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

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
  }, (firebaseConfig as any).firestoreDatabaseId);
} catch (error) {
  console.info('Firestore is already initialized, falling back to getFirestore:', error);
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}

export const db = firestoreDb;
export const storage = getStorage(app);

