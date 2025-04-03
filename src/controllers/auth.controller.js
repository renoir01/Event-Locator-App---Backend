const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

class AuthController {
  static async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.error(
          req.t ? req.t('validation.error') : 'Validation error',
          'VALIDATION_ERROR',
          errors.array(),
          400
        );
      }

      const { email, password, name, preferredLanguage, latitude, longitude } = req.body;

      // Check if user already exists
      const query = `SELECT id FROM users WHERE email = $1`;
      const { rows } = await db.query(query, [email]);
      const existingUser = rows[0];
      
      if (existingUser) {
        logger.info(`Registration attempt with existing email: ${email}`);
        return res.error(
          req.t ? req.t('auth.email_exists') : 'An account with this email already exists. Please login or use a different email address.',
          'EMAIL_EXISTS',
          null,
          400
        );
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        name,
        preferredLanguage,
        latitude,
        longitude
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Log successful registration
      logger.info(`New user registered: ${email} (ID: ${user.id})`);

      return res.success(
        req.t ? req.t('auth.registration_success') : 'Registration successful',
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            preferredLanguage: user.preferred_language,
            latitude: user.latitude,
            longitude: user.longitude
          }
        },
        201
      );
    } catch (error) {
      logger.error('Registration error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique violation in PostgreSQL
        return res.error(
          req.t ? req.t('auth.email_exists') : 'An account with this email already exists. Please login or use a different email address.',
          'EMAIL_EXISTS',
          null,
          400
        );
      }
      
      // Handle other errors
      return res.error(
        req.t ? req.t('error.server') : 'An unexpected error occurred. Please try again later.',
        'SERVER_ERROR',
        process.env.NODE_ENV === 'development' ? error.message : undefined,
        500
      );
    }
  }

  static async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.error(
          req.t ? req.t('validation.error') : 'Validation error',
          'VALIDATION_ERROR',
          errors.array(),
          400
        );
      }

      const { email, password } = req.body;

      // Find user
      const query = `SELECT id, email, password_hash, name, preferred_language, 
                    ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude 
                    FROM users WHERE email = $1`;
      const { rows } = await db.query(query, [email]);
      const user = rows[0];
      
      if (!user) {
        logger.info(`Login attempt with non-existent email: ${email}`);
        return res.error(
          req.t ? req.t('auth.invalid_credentials') : 'The email or password you entered is incorrect. Please try again.',
          'INVALID_CREDENTIALS',
          null,
          401
        );
      }

      // Validate password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        logger.info(`Failed login attempt for user: ${email}`);
        return res.error(
          req.t ? req.t('auth.invalid_credentials') : 'The email or password you entered is incorrect. Please try again.',
          'INVALID_CREDENTIALS',
          null,
          401
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Log successful login
      logger.info(`User logged in: ${email} (ID: ${user.id})`);

      return res.success(
        req.t ? req.t('auth.login_success') : 'Login successful',
        {
          token,
          user: {
            id: user.id,
            email: email,
            name: user.name,
            preferredLanguage: user.preferred_language,
            latitude: user.latitude,
            longitude: user.longitude
          }
        },
        200
      );
    } catch (error) {
      logger.error('Login error:', error);
      
      // Handle errors
      return res.error(
        req.t ? req.t('error.server') : 'An unexpected error occurred. Please try again later.',
        'SERVER_ERROR',
        process.env.NODE_ENV === 'development' ? error.message : undefined,
        500
      );
    }
  }

  static async updateLocation(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: req.t ? req.t('validation.error') : 'Validation error',
            details: errors.array()
          }
        });
      }

      const { latitude, longitude } = req.body;
      const userId = req.user.id;

      await User.updateLocation(userId, latitude, longitude);

      res.json({
        success: true,
        message: req.t ? req.t('user.location_updated') : 'Location updated successfully',
        data: {
          latitude,
          longitude
        }
      });
    } catch (error) {
      logger.error('Update location error:', error);
      next(error);
    }
  }
}

module.exports = AuthController;
