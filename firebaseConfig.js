import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_PROD_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROD_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROD_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROD_STORAGEBUCKET,
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const auth = getAuth(app);
