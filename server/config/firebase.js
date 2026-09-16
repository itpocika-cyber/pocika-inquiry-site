import admin from 'firebase-admin';
import { config } from './env.js';

export const initFirebase = () => {
  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    console.warn('Firebase configuration is incomplete. Authentication will be disabled.');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    console.log('Firebase Admin initialized successfully.');
    return admin;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    return null;
  }
};
