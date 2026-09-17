import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const errorDetails = issues.map(e => `${e.path.length ? e.path.join('.') + ': ' : ''}${e.message}`).join('; ');
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${errorDetails}`,
      details: issues
    }, 400);
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided: ' + details.join(', '),
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

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum limit of 10MB per photo.'
      }, 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return errorResponse(res, {
        code: 'TOO_MANY_FILES',
        message: 'Maximum 5 photos can be uploaded at a time.'
      }, 400);
    }
    return errorResponse(res, {
      code: 'UPLOAD_ERROR',
      message: err.message
    }, 400);
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return errorResponse(res, {
      code: 'INVALID_FILE_TYPE',
      message: err.message
    }, 400);
  }

  if (err.message && (err.message.includes('buffering timed out') || err.message.includes('Could not connect to any servers in your MongoDB Atlas cluster'))) {
    return errorResponse(res, {
      code: 'DATABASE_TIMEOUT',
      message: 'MongoDB connection timed out. Please verify that your current IP address is whitelisted in MongoDB Atlas Network Access (or set to 0.0.0.0/0).'
    }, 503);
  }

  return errorResponse(res, {
    code: 'SERVER_ERROR',
    message: err.message || 'Server Error'
  }, err.statusCode || 500);
};
