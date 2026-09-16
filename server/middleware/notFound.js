import { errorResponse } from '../utils/apiResponse.js';

export const notFound = (req, res, next) => {
  return errorResponse(res, {
    code: 'NOT_FOUND',
    message: 'Route not found'
  }, 404);
};
