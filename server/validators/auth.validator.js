import { z } from 'zod';
import { errorResponse } from '../utils/apiResponse.js';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.')
});

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  displayName: z.string().trim().min(1, 'Display name is required.'),
  role: z.enum(['admin', 'sales_person', 'manager', 'super_admin']).optional().default('sales_person')
});

export const validateLogin = (req, res, next) => {
  try {
    req.body = loginSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || [];
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'Validation failed.',
        details: issues
      }, 400);
    }
    next(err);
  }
};

export const validateRegister = (req, res, next) => {
  try {
    req.body = registerSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || [];
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'Validation failed.',
        details: issues
      }, 400);
    }
    next(err);
  }
};
