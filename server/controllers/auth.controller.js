import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { User } from '../models/User.js';

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      }, 401);
    }

    // Return safe user profile from request context or database
    const safeUser = {
      id: req.user.id,
      firebaseUid: req.user.firebaseUid,
      email: req.user.email,
      displayName: req.user.displayName,
      photoURL: req.user.photoURL,
      role: req.user.role,
      isActive: req.user.isActive
    };

    return successResponse(res, { user: safeUser });
  } catch (error) {
    next(error);
  }
};
