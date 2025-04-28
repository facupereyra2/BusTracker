import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAXONWs47a2AumDGEPRsIX8tf7N4OXJU0g",
    authDomain: "tesina-418423.firebaseapp.com",
    databaseURL: "https://tesina-418423-default-rtdb.firebaseio.com",
    projectId: "tesina-418423",
    storageBucket: "tesina-418423.appspot.com",
    messagingSenderId: "874151633181",
    appId: "1:874151633181:web:aae09290a7524403d881f4",
    measurementId: "G-YZLRYV13MY"
  };

export const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
export const auth = getAuth(app);

export default app;