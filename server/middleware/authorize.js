import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware to restrict route access based on user role.
 * Roles: 'super_admin', 'admin', 'sales_person', 'manager'
 * 
 * @param  {...string} allowedRoles 
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      }, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, {
        code: 'FORBIDDEN',
        message: 'Access denied.'
      }, 403);
    }

    next();
  };
};
