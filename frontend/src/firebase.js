import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database"; // ← add this

const firebaseConfig = {
  apiKey: "AIzaSyCjliD85oQgy2nCIRJUrVqRbNgx-l3YPPU",
  authDomain: "meditrack-plsp.firebaseapp.com",
  projectId: "meditrack-plsp",
  databaseURL: "https://meditrack-plsp-default-rtdb.asia-southeast1.firebasedatabase.app", // ← .firebasedatabase.app not .firebaseapp.com // ← add this
  storageBucket: "meditrack-plsp.firebasestorage.app",
  messagingSenderId: "1031940935164",
  appId: "1:1031940935164:web:287395608e93f980173679",
  measurementId: "G-MMKXTVRKK2"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // ← add this