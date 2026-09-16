import { initFirebase } from '../config/firebase.js';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';
import mongoose from 'mongoose';

const authInstance = initFirebase();

/**
 * Authenticates a request using Firebase Admin SDK and attaches the user document to req.user.
 */
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Reject missing Authorization header
  if (!authHeader) {
    return errorResponse(res, {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.'
    }, 401);
  }

  // Reject malformed Authorization header
  if (!authHeader.startsWith('Bearer ') || authHeader.split(' ').length !== 2) {
    return errorResponse(res, {
      code: 'INVALID_TOKEN_FORMAT',
      message: 'Authentication required. Invalid token format.'
    }, 401);
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return errorResponse(res, {
      code: 'EMPTY_TOKEN',
      message: 'Authentication required. Token is empty.'
    }, 401);
  }

  // If Firebase Admin is not initialized
  if (!authInstance) {
    console.error('Firebase Admin SDK is not initialized. Check server environment variables.');
    return errorResponse(res, {
      code: 'AUTH_SERVICE_UNAVAILABLE',
      message: 'Authentication service unavailable.'
    }, 503);
  }

  let decodedToken;
  try {
    decodedToken = await authInstance.verifyIdToken(token);
  } catch (error) {
    // Distinguish expired vs invalid token
    if (error.code === 'auth/id-token-expired') {
      return errorResponse(res, {
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please sign in again.'
      }, 401);
    }
    return errorResponse(res, {
      code: 'INVALID_TOKEN',
      message: 'Authentication required. Invalid or expired token.'
    }, 401);
  }

  const { uid, email, name, picture } = decodedToken;

  try {
    // If DB is connected, fetch or provision the user in MongoDB
    if (mongoose.connection.readyState === 1) {
      let user = await User.findOne({ firebaseUid: uid });

      const normalizedEmail = (email || `${uid}@pocika.local`).toLowerCase().trim();
      const isAdminAccount = normalizedEmail === 'admin@pocika.com';

      if (!user) {
        // Safe first-login provisioning: admin@pocika.com gets admin, others get sales_person
        user = await User.create({
          firebaseUid: uid,
          email: normalizedEmail,
          displayName: name || decodedToken.displayName || (isAdminAccount ? 'Administrator' : ''),
          photoURL: picture || decodedToken.picture || '',
          role: isAdminAccount ? 'admin' : 'sales_person',
          isActive: true,
          lastLoginAt: new Date()
        });
        console.log(`Provisioned new user: ${user.email} with role ${user.role}`);
      } else {
        // Inactive user check: return 403 Forbidden
        if (!user.isActive) {
          return errorResponse(res, {
            code: 'ACCOUNT_INACTIVE',
            message: 'Your account is inactive. Contact an administrator.'
          }, 403);
        }

        // Ensure admin@pocika.com has admin role
        if (isAdminAccount && user.role !== 'admin' && user.role !== 'super_admin') {
          user.role = 'admin';
        }

        // Update last login timestamp & sync display name/photo if updated
        user.lastLoginAt = new Date();
        if (name && !user.displayName) user.displayName = name;
        if (picture && !user.photoURL) user.photoURL = picture;
        await user.save();
      }

      // Attach authoritative user object to request
      req.user = {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        isActive: user.isActive
      };
    } else {
      // If DB is offline (e.g. Atlas connection timeout), provide safe fallback context
      console.warn('Database is disconnected; continuing with verified token context.');
      req.user = {
        id: uid,
        firebaseUid: uid,
        email: (email || '').toLowerCase().trim(),
        displayName: name || '',
        photoURL: picture || '',
        role: (email || '').toLowerCase() === 'admin@pocika.com' ? 'admin' : 'sales_person',
        isActive: true
      };
    }

    return next();
  } catch (dbError) {
    console.error('Error in user authentication lookup:', dbError.message);
    return errorResponse(res, {
      code: 'AUTH_INTERNAL_ERROR',
      message: 'Failed to process user authentication.'
    }, 500);
  }
};

// Backwards-compatible alias for existing imports
export const requireAuth = authenticateUser;
