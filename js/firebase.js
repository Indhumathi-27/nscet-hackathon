import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey: "AIzaSyByU-lkRIxXU6Ukij0F5hfafp63FZRAVSE",

    authDomain: "nscet-student-hackathon.firebaseapp.com",

    projectId: "nscet-student-hackathon",

    storageBucket: "nscet-student-hackathon.firebasestorage.app",

    messagingSenderId: "1098448622343",

    appId: "1:1098448622343:web:4d9f168a7d1b3fb9982ba2"

};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);