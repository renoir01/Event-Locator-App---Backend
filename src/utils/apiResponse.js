/**
 * Utility for standardized API responses
 */

/**
 * Create a success response
 * @param {Object} options - Response options
 * @param {string} options.message - Success message
 * @param {Object} options.data - Response data
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @returns {Object} Standardized success response
 */
const success = ({ message, data = {}, statusCode = 200 }) => ({
  success: true,
  message,
  data,
  statusCode
});

/**
 * Create an error response
 * @param {Object} options - Error options
 * @param {string} options.message - Error message
 * @param {string} options.code - Error code
 * @param {Object} options.details - Additional error details
 * @param {number} options.statusCode - HTTP status code (default: 400)
 * @returns {Object} Standardized error response
 */
const error = ({ message, code, details, statusCode = 400 }) => ({
  success: false,
  error: {
    message,
    code,
    ...(details && { details })
  },
  statusCode
});

module.exports = {
  success,
  error
};
