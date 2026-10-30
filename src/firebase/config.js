import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase config is read from environment variables (set them in Vercel
// → Project Settings → Environment Variables, or in a local .env file).
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAPBK_l-NHx2LfEyWGf-GpExXgWqT3QCnY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "rider-s-901dc.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "rider-s-901dc",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "rider-s-901dc.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "674894824291",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:674894824291:web:86e891bfe27bb361908956"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
