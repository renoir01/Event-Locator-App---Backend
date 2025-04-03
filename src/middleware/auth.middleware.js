const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided or invalid format');
      return res.status(401).json({
        error: {
          message: req.t ? req.t('auth.unauthorized') : 'Authentication required'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
      
      logger.debug(`User authenticated: ${decoded.email} (${decoded.userId})`);
      next();
    } catch (jwtError) {
      logger.warn(`JWT verification failed: ${jwtError.message}`);
      return res.status(401).json({
        error: {
          message: req.t ? req.t('auth.invalid_token') : 'Invalid or expired token'
        }
      });
    }
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    return res.status(500).json({
      error: {
        message: req.t ? req.t('error.server') : 'Server error during authentication'
      }
    });
  }
};

module.exports = authMiddleware;
