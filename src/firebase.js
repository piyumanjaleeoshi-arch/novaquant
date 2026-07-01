import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCukJZ4PcuH3RoElQlu_4LR43QBt5m8yPU",
  authDomain: "silken-will-kthgf.firebaseapp.com",
  projectId: "silken-will-kthgf",
  storageBucket: "silken-will-kthgf.firebasestorage.app",
  messagingSenderId: "959701243131",
  appId: "1:959701243131:web:519d8f04b1b1f4e5df8c5e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
