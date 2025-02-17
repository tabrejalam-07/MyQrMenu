const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDHfctsAeDQOMkH9eNBU3JdXuOUZ4hMK64",
    authDomain: "myqrmenu-7a009.firebaseapp.com",
    projectId: "myqrmenu-7a009",
    storageBucket: "myqrmenu-7a009.firebasestorage.app",
    messagingSenderId: "526725653767",
    appId: "1:526725653767:web:43793513d1f0ece3c951a2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db }; 