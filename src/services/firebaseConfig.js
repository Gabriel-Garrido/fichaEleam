// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsAKDbOssdYYXylEgf5XcrPRWOG_e_3UA",
  authDomain: "fichaeleam.firebaseapp.com",
  projectId: "fichaeleam",
  storageBucket: "fichaeleam.firebasestorage.app",
  messagingSenderId: "240231713532",
  appId: "1:240231713532:web:5f1840363e165ab0dde579",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
