import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";



const firebaseConfig = {
    apiKey: "AIzaSyDWY4_Qu891TbNPCGdhC_Vqd70Oai3OPyM",
    authDomain: "test-dd24c.firebaseapp.com",
    databaseURL: "https://test-dd24c-default-rtdb.firebaseio.com",
    projectId: "test-dd24c",
    storageBucket: "test-dd24c.firebasestorage.app",
    messagingSenderId: "608816722136",
    appId: "1:608816722136:web:8bfe2f6e2759c16e98a7ad",
    measurementId: "G-2HG25VYL99"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase();

const usersRef = ref(db, "users");

get(usersRef)
    .then((snapshot) => {
        if (snapshot.exists()) {
        const users = snapshot.val();
        console.log(users);
        } else {
        console.log("No users found");
        }
    })
    .catch((error) => {
        console.error(error);
    });



