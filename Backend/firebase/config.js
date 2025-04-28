const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
module.exports = {db}

