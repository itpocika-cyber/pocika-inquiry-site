import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAd2AwdkqUCWkkonIU0iC0AiCn2WnYPLeU",
  authDomain: "pocika-sales-inquiry-system.firebaseapp.com",
  projectId: "pocika-sales-inquiry-system"
  // Note: Media storage is exclusively handled by Cloudinary
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize persistence
setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Cache for backend user profile
let cachedUserProfile = null;

// Auth readiness tracking to prevent race conditions on page load
let isAuthReady = false;
let authReadyResolver = null;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolver = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (!isAuthReady) {
    isAuthReady = true;
    if (authReadyResolver) authReadyResolver(user);
  }
});

/**
 * Wait for Firebase Auth to finish initial local credential resolution
 */
export async function waitForAuth() {
  if (isAuthReady) return auth.currentUser;
  return authReadyPromise;
}

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    cachedUserProfile = null; // reset cache
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

/**
 * Sign out and clear cached profile
 */
export async function signOut() {
  cachedUserProfile = null;
  sessionStorage.removeItem('pocika_user_profile');
  return firebaseSignOut(auth);
}

/**
 * Get current ID token with auto-refresh if needed.
 * Automatically waits for Firebase auth state resolution to prevent premature null tokens.
 */
export async function getIdToken(forceRefresh = false) {
  if (!isAuthReady) {
    await authReadyPromise;
  }
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

/**
 * Fetch authenticated user's backend profile (/api/v1/auth/me)
 */
export async function getUserProfile(forceRefresh = false) {
  if (cachedUserProfile && !forceRefresh) {
    return cachedUserProfile;
  }

  // Try reading from sessionStorage cache
  if (!forceRefresh) {
    const stored = sessionStorage.getItem('pocika_user_profile');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const email = (parsed.email || '').toLowerCase();
        // If email is admin@pocika.com but cached with non-admin role, discard cache
        if (email === 'admin@pocika.com' && parsed.role !== 'admin' && parsed.role !== 'super_admin') {
          sessionStorage.removeItem('pocika_user_profile');
        } else {
          cachedUserProfile = parsed;
          return cachedUserProfile;
        }
      } catch (e) {}
    }
  }

  const token = await getIdToken(forceRefresh);
  if (!token) return null;

  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 403) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Your account is inactive. Contact an administrator.');
    }

    if (!response.ok) {
      throw new Error('Failed to load user profile from server');
    }

    const data = await response.json();
    cachedUserProfile = data.data.user;

    // Safety guarantee for admin@pocika.com
    if ((cachedUserProfile.email || '').toLowerCase() === 'admin@pocika.com' && cachedUserProfile.role !== 'super_admin') {
      cachedUserProfile.role = 'admin';
    }

    sessionStorage.setItem('pocika_user_profile', JSON.stringify(cachedUserProfile));
    return cachedUserProfile;
  } catch (error) {
    console.warn('Backend user profile fetch:', error.message);
    // Fallback if backend is unavailable
    if (auth.currentUser) {
      const email = (auth.currentUser.email || '').toLowerCase();
      const isAdminAccount = email === 'admin@pocika.com';
      cachedUserProfile = {
        id: auth.currentUser.uid,
        firebaseUid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || auth.currentUser.email || (isAdminAccount ? 'Administrator' : ''),
        photoURL: auth.currentUser.photoURL || '',
        role: isAdminAccount ? 'admin' : 'sales_person',
        isActive: true
      };
      sessionStorage.setItem('pocika_user_profile', JSON.stringify(cachedUserProfile));
      return cachedUserProfile;
    }
    return null;
  }
}

export { auth, signInWithEmailAndPassword, onAuthStateChanged };
