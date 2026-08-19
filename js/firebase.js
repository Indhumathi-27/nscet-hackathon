import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA4iNxxC4ebCk8RZiekhBiC0t6PXAvTL1k",
    authDomain: "nscet-register.firebaseapp.com",
    databaseURL: "https://nscet-register-default-rtdb.firebaseio.com",
    projectId: "nscet-register",
    storageBucket: "nscet-register.firebasestorage.app",
    messagingSenderId: "177920268755",
    appId: "1:177920268755:web:fd857c5365359307abf726",
    measurementId: "G-8KN8BLCTKC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);