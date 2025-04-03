const logger = require('../config/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error:', err);
  
  // Determine error type and respond accordingly
  if (err.type === 'ValidationError') {
    const response = apiResponse.error({
      message: req.t ? req.t('validation.error') : 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details,
      statusCode: 400
    });
    return res.status(response.statusCode).json(response);
  }

  if (err.type === 'AuthenticationError') {
    const response = apiResponse.error({
      message: req.t ? req.t('auth.unauthorized') : 'Unauthorized',
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401
    });
    return res.status(response.statusCode).json(response);
  }

  if (err.type === 'ForbiddenError') {
    const response = apiResponse.error({
      message: req.t ? req.t('auth.forbidden') : 'Forbidden',
      code: 'FORBIDDEN',
      statusCode: 403
    });
    return res.status(response.statusCode).json(response);
  }

  if (err.type === 'NotFoundError') {
    const response = apiResponse.error({
      message: req.t ? req.t('error.not_found') : 'Resource not found',
      code: 'NOT_FOUND',
      statusCode: 404
    });
    return res.status(response.statusCode).json(response);
  }

  // Default to 500 internal server error
  const response = apiResponse.error({
    message: req.t ? req.t('error.internal') : 'An internal server error occurred',
    code: 'SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    statusCode: 500
  });
  return res.status(response.statusCode).json(response);
};

module.exports = {
  errorHandler
};
