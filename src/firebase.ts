// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCh0mQRGunzCTVusAayuscottU1lwFeJn0",
  authDomain: "nexuslearn-ai-sfdbq.firebaseapp.com",
  projectId: "nexuslearn-ai-sfdbq",
  storageBucket: "nexuslearn-ai-sfdbq.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "736968795180",
  appId: "1:736968795180:web:7dfcaae00b2ce710e79d89"
};


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);

export { app, auth };
