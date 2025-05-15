
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, type Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics"; // Import isSupported

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
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
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
      console.error(
        "Firebase API Key is missing. Ensure Firebase configuration is correctly set in src/firebase.ts."
      );
      // App initialization will likely fail here if apiKey is missing
    }
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      // Asynchronously check if Analytics is supported and then initialize
      isAnalyticsSupported().then((supported) => {
        if (supported && firebaseConfig.measurementId) {
          analytics = getAnalytics(app);
        }
      }).catch(err => {
        console.warn("Error checking Firebase Analytics support:", err);
      });
    } catch (e) {
      console.error("Error initializing Firebase app:", e);
      // This error is critical and likely means Firebase services won't work
    }
  } else {
    app = getApp(); // Get existing app
    auth = getAuth(app);
    db = getFirestore(app);
    // For existing app, also check Analytics support (if not already initialized)
     isAnalyticsSupported().then((supported) => {
        if (supported && firebaseConfig.measurementId && !analytics) { // Check if analytics is not already set
            try {
                analytics = getAnalytics(app);
            } catch (e) {
                // console.warn("Firebase Analytics could not be initialized on existing app (possibly already initialized or not supported).", e);
            }
        }
    }).catch(err => {
        console.warn("Error checking Firebase Analytics support for existing app:", err);
    });
  }
} else {
  // This block is for server-side or non-browser environments.
  // Client SDKs are generally not initialized here.
  console.warn("Firebase client SDK not initialized (not in a browser environment). Auth, DB, and Analytics might not be available if accessed server-side via these exports without separate server-side initialization.");
}

// Ensure app, auth, db are exported. They might be undefined if accessed server-side
// without proper server-side initialization, which is outside the scope of this client-side setup.
// @ts-ignore
export { app, auth, db, analytics };
