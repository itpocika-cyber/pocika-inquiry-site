import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from './env.js';

let authInstance = null;

export const initFirebase = () => {
  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    console.warn('Firebase configuration is incomplete. Authentication will be disabled.');
    return null;
  }

  if (authInstance) return authInstance;

  try {
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
