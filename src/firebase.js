import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAu16Z14TM14xS9SpI8CEmUmM5BiIrb7qE",
  authDomain: "freedom-eats.firebaseapp.com",
  projectId: "freedom-eats",
  storageBucket: "freedom-eats.firebasestorage.app",
  messagingSenderId: "476633543833",
  appId: "1:476633543833:web:6d5fb462d670a4cc683408",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export default app;
