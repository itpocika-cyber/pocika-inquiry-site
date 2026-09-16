import { initFirebase } from '../config/firebase.js';
import { errorResponse } from '../utils/apiResponse.js';

const admin = initFirebase();

export const requireAuth = async (req, res, next) => {
  if (!admin) {
    // If Firebase isn't configured, bypass auth (useful for local dev without credentials)
    console.warn('Auth bypassed because Firebase Admin is not initialized.');
    req.user = { uid: 'dev-user', email: 'dev@pocika.local' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token' }, 401);
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Token verification failed' }, 401);
  }
};
