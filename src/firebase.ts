
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// These values are sourced from environment variables.
// Ensure that NEXT_PUBLIC_FIREBASE_API_KEY and other related variables
// are correctly set in your .env.local file.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  // Check if all required config values are present, especially API key
  if (!firebaseConfig.apiKey) {
    console.error(
      "Firebase API Key is missing. Make sure NEXT_PUBLIC_FIREBASE_API_KEY is set in your environment."
    );
    // You might want to throw an error or handle this state appropriately
    // For now, we'll try to initialize, and Firebase will likely throw an error if the key is truly missing/invalid.
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (getApps().length > 0) {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // This case should ideally not be hit in a typical client-side Next.js app
  // For server-side scenarios, initialization might differ or be handled elsewhere.
  // If initializing here for server, ensure config is available.
  // However, given NEXT_PUBLIC_ prefix, these are client-side vars.
  // If a Firebase App instance is not available and we are not in a browser context,
  // we cannot initialize auth and db safely here without more context.
  // For this application's structure, Firebase is primarily client-side.
  // Throwing an error or logging might be appropriate if this path is unexpectedly hit.
  console.warn("Firebase app not initialized and not in a browser environment. Auth and DB might not be available.");
  // Assign dummy or throw, depending on desired strictness. For now, let it be potentially undefined.
  // This will be caught by AuthProvider checks if firebaseAuthInstance is undefined.
}

// @ts-ignore
export { app, auth, db };
