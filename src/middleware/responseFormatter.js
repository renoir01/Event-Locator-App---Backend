/**
 * Middleware to standardize API responses
 */
const apiResponse = require('../utils/apiResponse');

/**
 * Extends response object with standardized success and error methods
 */
const responseFormatter = (req, res, next) => {
  // Add success method to response object
  res.success = function(message, data = {}, statusCode = 200) {
    const response = apiResponse.success({
      message,
      data,
      statusCode
    });
    return this.status(statusCode).json(response);
  };

  // Add error method to response object
  res.error = function(message, code, details, statusCode = 400) {
    const response = apiResponse.error({
      message,
      code,
      details,
      statusCode
    });
    return this.status(statusCode).json(response);
  };

  next();
};

module.exports = responseFormatter;
