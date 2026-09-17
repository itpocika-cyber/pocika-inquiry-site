import { z } from 'zod';
import { errorResponse } from '../utils/apiResponse.js';

export const createUserSchema = z.object({
  email: z.string().email('Valid email address is required.').trim().toLowerCase(),
  displayName: z.string().min(2, 'Name must be at least 2 characters long.').trim(),
  role: z.enum(['sales_person', 'manager', 'admin']).default('sales_person'),
  password: z.string().min(6, 'Password must be at least 6 characters long.').optional().or(z.literal(''))
});

export const updateUserSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters long.').trim().optional(),
  role: z.enum(['sales_person', 'manager', 'admin']).optional(),
  isActive: z.boolean().optional()
});

export const validateCreateUser = (req, res, next) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message || 'Invalid user data.';
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: firstError,
      details: result.error.format()
    }, 400);
  }
  req.body = result.data;
  next();
};

export const validateUpdateUser = (req, res, next) => {
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message || 'Invalid update data.';
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: firstError,
      details: result.error.format()
    }, 400);
  }
  req.body = result.data;
  next();
};
