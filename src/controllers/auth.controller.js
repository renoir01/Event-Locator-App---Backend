const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');

class AuthController {
  static async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t('validation.error'),
            details: errors.array()
          }
        });
      }

      const { email, password, name, preferredLanguage, latitude, longitude } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: {
            message: req.t('auth.email_exists')
          }
        });
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
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        message: req.t('auth.registration_success'),
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            preferredLanguage: user.preferred_language
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t('validation.error'),
            details: errors.array()
          }
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: {
            message: req.t('auth.invalid_credentials')
          }
        });
      }

      // Validate password
      const isValidPassword = await User.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: {
            message: req.t('auth.invalid_credentials')
          }
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        message: req.t('auth.login_success'),
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            preferredLanguage: user.preferred_language,
            latitude: user.latitude,
            longitude: user.longitude
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLocation(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t('validation.error'),
            details: errors.array()
          }
        });
      }

      const { latitude, longitude } = req.body;
      const userId = req.user.id;

      await User.updateLocation(userId, latitude, longitude);

      res.json({
        message: req.t('user.location_updated'),
        data: { latitude, longitude }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
