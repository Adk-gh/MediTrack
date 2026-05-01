// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjliD85oQgy2nCIRJUrVqRbNgx-l3YPPU",
  authDomain: "meditrack-plsp.firebaseapp.com",
  projectId: "meditrack-plsp",
  storageBucket: "meditrack-plsp.firebasestorage.app",
  messagingSenderId: "1031940935164",
  appId: "1:1031940935164:web:287395608e93f980173679",
  measurementId: "G-MMKXTVRKK2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);