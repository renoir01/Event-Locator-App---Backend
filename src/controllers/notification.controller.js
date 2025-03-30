const { validationResult } = require('express-validator');
const NotificationService = require('../services/notification.service');

class NotificationController {
  static async getUserNotifications(req, res, next) {
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

      const { limit, offset } = req.query;
      const notifications = await NotificationService.getUserNotifications(
        req.user.id,
        parseInt(limit) || 10,
        parseInt(offset) || 0
      );

      res.json({
        message: req.t('notifications.retrieved'),
        data: notifications.map(notification => ({
          ...notification,
          categoryName: notification[`category_name_${req.user.preferred_language}`]
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
