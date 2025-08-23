import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database'; // <-- Importa Realtime Database


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAXONWs47a2AumDGEPRsIX8tf7N4OXJU0g",
  authDomain: "tesina-418423.firebaseapp.com",
  databaseURL: "https://tesina-418423-default-rtdb.firebaseio.com",
  projectId: "tesina-418423",
  storageBucket: "tesina-418423.firebasestorage.app",
  messagingSenderId: "874151633181",
  appId: "1:874151633181:web:aae09290a7524403d881f4",
  measurementId: "G-YZLRYV13MY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); // <-- Exporta la instancia de Realtime Database