// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqbxMPmJQy_hrPxTIfOff9JjJdImbUr4g",
  authDomain: "first-project-72603.firebaseapp.com",
  projectId: "first-project-72603",
  storageBucket: "first-project-72603.firebasestorage.app",
  messagingSenderId: "1056509091216",
  appId: "1:1056509091216:web:c1dc0812272ba767d92715",
  measurementId: "G-CQDQJXN05C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {app, db};