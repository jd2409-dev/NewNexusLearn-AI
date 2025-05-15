
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics"; // Added Analytics

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCh0mQRGunzCTVusAayuscottU1lwFeJn0",
  authDomain: "nexuslearn-ai-sfdbq.firebaseapp.com",
  projectId: "nexuslearn-ai-sfdbq",
  storageBucket: "nexuslearn-ai-sfdbq.firebasestorage.app",
  messagingSenderId: "736968795180",
  appId: "1:736968795180:web:7dfcaae00b2ce710e79d89",
  measurementId: "G-SNGGC6E9FE"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined; // Analytics can be undefined if not in browser

if (typeof window !== 'undefined' && !getApps().length) {
  // Check if all required config values are present, especially API key
  if (!firebaseConfig.apiKey) {
    console.error(
      "Firebase API Key is missing. Make sure NEXT_PUBLIC_FIREBASE_API_KEY (or your actual key) is set in your environment."
    );
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }
} else if (getApps().length > 0) {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  if (firebaseConfig.measurementId && typeof window !== 'undefined') {
    // Initialize analytics only if already initialized app and in browser
    try {
        analytics = getAnalytics(app);
    } catch (e) {
        // console.warn("Firebase Analytics could not be initialized (possibly already initialized or not supported).");
    }
  }
} else {
  // app, auth, db will be undefined here, which should be handled by consuming code
  // Ensure auth and db are assigned a default or error state if not initialized
  // For this fix, we assume initialization logic remains as is, but note potential for undefined if not in browser
  console.warn("Firebase app not initialized and not in a browser environment. Auth, DB, and Analytics might not be available.");
}

// @ts-ignore - To allow for undefined in server context where auth/db might not be initialized
export { app, auth, db, analytics, firebaseConfig };
