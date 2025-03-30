const { validationResult } = require('express-validator');
const User = require('../models/user.model');

class UserController {
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferred_language: user.preferred_language,
          location: user.location
        }
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
            message: req.t('validation.error'),
            details: errors.array()
          }
        });
      }

      const { categoryId, notificationRadius } = req.body;
      await User.updatePreferences(req.user.id, categoryId, notificationRadius);

      res.json({
        message: req.t('preferences.updated')
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
