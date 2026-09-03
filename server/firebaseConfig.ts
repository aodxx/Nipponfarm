import "dotenv/config";

export type FirebaseRuntimeConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getFirebaseRuntimeConfig(): FirebaseRuntimeConfig {
  return {
    apiKey: required("VITE_FIREBASE_API_KEY"),
    authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: required("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: required("VITE_FIREBASE_APP_ID"),
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
    firestoreDatabaseId: process.env.VITE_FIRESTORE_DATABASE_ID?.trim() || undefined,
  };
}
