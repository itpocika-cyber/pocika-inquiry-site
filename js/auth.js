import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAd2AwdkqUCWkkonIU0iC0AiCn2WnYPLeU",
  authDomain: "pocika-sales-inquiry-system.firebaseapp.com",
  projectId: "pocika-sales-inquiry-system",
  storageBucket: "pocika-sales-inquiry-system.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize persistence
setPersistence(auth, browserLocalPersistence);

export { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut };

// Global auth state listener
onAuthStateChanged(auth, (user) => {
  const isLoginPage = window.location.pathname.includes('login.html');
  
  if (user) {
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
    }
  } else {
    // If not logged in and not on login page, redirect to login
    if (!isLoginPage) {
      window.location.href = 'login.html';
    }
  }
});
