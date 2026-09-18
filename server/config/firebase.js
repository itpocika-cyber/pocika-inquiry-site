/**
 * Firebase Admin SDK Configuration
 *
 * NOTE: Firebase services and authentication are currently disabled via
 * FIREBASE_ENABLED (default: false) pending a later decision. When disabled,
 * this module safely acts as a no-op without initializing Firebase Admin
 * or requiring Firebase environment credentials.
 */

import { config } from './env.js';

let authInstance = null;

/**
 * Initializes Firebase Admin SDK if FIREBASE_ENABLED=true.
 * Returns null safely if disabled or configuration is incomplete.
 */
export const initFirebase = async () => {
  if (!config.firebaseEnabled) {
    // Disabled via FIREBASE_ENABLED - safe no-op
    return null;
  }

  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    console.warn('Firebase is enabled but credentials are incomplete. Skipping Firebase initialization.');
    return null;
  }

  if (authInstance) return authInstance;

  try {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');

    const app = initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    console.log('Firebase Admin initialized successfully.');
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    return null;
  }
};

/**
 * Returns the active Firebase Auth instance if initialized, or null.
 */
export const getFirebaseAuth = () => authInstance;

export default {
  initFirebase,
  getFirebaseAuth
};
