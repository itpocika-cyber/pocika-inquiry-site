import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  
  if (err.name === 'ZodError') {
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid inquiry data',
      details: err.errors
    }, 400);
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided',
      details
    }, 400);
  }

  if (err.code === 11000) {
    return errorResponse(res, {
      code: 'DUPLICATE_INQUIRY',
      message: 'Duplicate value entered',
      details: Object.keys(err.keyValue)
    }, 409);
  }

  if (err.name === 'CastError') {
    return errorResponse(res, {
      code: 'INVALID_ID',
      message: 'Resource not found'
    }, 404);
  }

  return errorResponse(res, {
    code: 'SERVER_ERROR',
    message: err.message || 'Server Error'
  }, err.statusCode || 500);
};
