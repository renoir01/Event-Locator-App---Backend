const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const redisClient = require('../config/redis');

class UserController {
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('user.not_found') : 'User not found'
          }
        });
      }

      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferred_language: user.preferred_language,
          latitude: user.latitude,
          longitude: user.longitude,
          created_at: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('validation.error') : 'Validation error',
            details: errors.array()
          }
        });
      }

      const { name, preferredLanguage, latitude, longitude } = req.body;
      let updatedUser = null;

      // Update language if provided
      if (preferredLanguage) {
        updatedUser = await User.updateLanguage(req.user.id, preferredLanguage);
      }

      // Update location if provided
      if (latitude && longitude) {
        updatedUser = await User.updateLocation(req.user.id, latitude, longitude);
      }

      if (!updatedUser) {
        updatedUser = await User.findById(req.user.id);
      }

      res.json({
        message: req.t ? req.t('profile.updated') : 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPreferences(req, res, next) {
    try {
      const preferences = await User.getPreferences(req.user.id);
      
      res.json({
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('validation.error') : 'Validation error',
            details: errors.array()
          }
        });
      }

      // Accept either categoryIds or preferredCategories
      const categoryIds = req.body.categoryIds || req.body.preferredCategories;
      const { notificationRadius } = req.body;
      
      if (!Array.isArray(categoryIds) || !categoryIds.length) {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('preferences.invalid_categories') : 'Invalid category selection'
          }
        });
      }

      const preferences = await User.updatePreferences(req.user.id, {
        categoryIds,
        notificationRadius: parseFloat(notificationRadius) || 5.0
      });

      // Publish user preferences update for notification service
      await redisClient.publish('user_preferences', JSON.stringify({
        type: 'preferences_updated',
        data: {
          userId: req.user.id,
          preferences
        }
      }));

      res.json({
        message: req.t ? req.t('preferences.updated') : 'Preferences updated successfully',
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFavoriteEvents(req, res, next) {
    try {
      const events = await User.getFavoriteEvents(req.user.id);
      
      res.json({
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  static async addFavoriteEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      
      const favorite = await User.addFavoriteEvent(req.user.id, eventId);
      
      res.json({
        message: req.t ? req.t('favorites.added') : 'Event added to favorites',
        data: favorite
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeFavoriteEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      
      const result = await User.removeFavoriteEvent(req.user.id, eventId);
      
      if (!result) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('favorites.not_found') : 'Event not in favorites'
          }
        });
      }
      
      res.json({
        message: req.t ? req.t('favorites.removed') : 'Event removed from favorites'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRegisteredEvents(req, res, next) {
    try {
      const events = await User.getRegisteredEvents(req.user.id);
      res.json({
        data: events
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
