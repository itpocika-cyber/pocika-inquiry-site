import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '7d';

/**
 * Sign a JWT token for a user
 */
function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      firebaseUid: user.firebaseUid || user._id.toString()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Log in with email and password
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required.'
      }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return errorResponse(res, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      }, 401);
    }

    // Verify password if user has one set
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }, 401);
      }
    } else {
      // If user had no password (legacy Firebase user), set this password
      user.password = password;
      await user.save();
    }

    if (!user.isActive) {
      return errorResponse(res, {
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Contact an administrator.'
      }, 403);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user);

    const safeUser = {
      id: user._id.toString(),
      userId: user._id.toString(),
      firebaseUid: user.firebaseUid || user._id.toString(),
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      role: user.role,
      isActive: user.isActive
    };

    return successResponse(res, { token, user: safeUser }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, displayName, role } = req.body;

    if (!email || !password) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required.'
      }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return errorResponse(res, {
        code: 'USER_EXISTS',
        message: 'A user with this email already exists.'
      }, 409);
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      displayName: displayName || normalizedEmail.split('@')[0],
      role: ['admin', 'manager', 'sales_person'].includes(role) ? role : 'sales_person',
      isActive: true
    });

    const token = createToken(user);
    const safeUser = {
      id: user._id.toString(),
      userId: user._id.toString(),
      firebaseUid: user.firebaseUid || user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL || '',
      role: user.role,
      isActive: user.isActive
    };

    return successResponse(res, { token, user: safeUser }, 201);
  } catch (error) {
    next(error);
  }
};

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

    const safeUser = {
      id: req.user.id,
      userId: req.user.id,
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

