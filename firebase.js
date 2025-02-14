// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYRRJoZX9r31zz5sxTyCQ22olqigBoVAM",
  authDomain: "pipelinewebapp-b4d24.firebaseapp.com",
  projectId: "pipelinewebapp-b4d24",
  storageBucket: "pipelinewebapp-b4d24.firebasestorage.app",
  messagingSenderId: "73135204707",
  appId: "1:73135204707:web:9b82207e5b8b1a3c0ecb56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);