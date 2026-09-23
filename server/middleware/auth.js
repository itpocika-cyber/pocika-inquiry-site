import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';
import { config } from '../config/env.js';
import mongoose from 'mongoose';

const JWT_SECRET = config.jwtSecret;

/**
 * Authenticates a request using JWT and attaches the user document to req.user.
 */
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.token;

  let token = null;

  if (authHeader) {
    // Reject malformed Authorization header
    if (!authHeader.startsWith('Bearer ') || authHeader.split(' ').length !== 2) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Auth Debug] Malformed Authorization header on ${req.method} ${req.originalUrl}`);
      }
      return errorResponse(res, {
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authentication required. Invalid token format.'
      }, 401);
    }
    token = authHeader.split('Bearer ')[1]?.trim();
  } else if (queryToken) {
    token = String(queryToken).trim();
  }

  // Reject missing Authorization token
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Auth Debug] Missing Authorization token on ${req.method} ${req.originalUrl}`);
    }
    return errorResponse(res, {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.'
    }, 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
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

  const userId = decoded.id || decoded.userId || decoded.uid;
  const email = (decoded.email || '').toLowerCase().trim();

  try {
    if (mongoose.connection.readyState === 1) {
      let user = null;
      if (userId && mongoose.isValidObjectId(userId)) {
        user = await User.findById(userId);
      }
      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (!user) {
        return errorResponse(res, {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token does not exist.'
        }, 401);
      }

      if (!user.isActive) {
        return errorResponse(res, {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account is inactive. Contact an administrator.'
        }, 403);
      }

      // Attach authoritative user object to request
      req.user = {
        id: user._id.toString(),
        userId: user._id.toString(),
        firebaseUid: user.firebaseUid || user._id.toString(),
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        role: user.role,
        isActive: user.isActive
      };
    } else {
      // Safe fallback context if DB is temporarily disconnected
      req.user = {
        id: userId || 'fallback-id',
        userId: userId || 'fallback-id',
        firebaseUid: decoded.firebaseUid || userId || 'fallback-id',
        email: email,
        displayName: decoded.displayName || decoded.name || email.split('@')[0],
        photoURL: decoded.photoURL || '',
        role: decoded.role || (email === 'pocika@gmail.com' || email === 'admin@pocika.com' ? 'admin' : 'sales_person'),
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

