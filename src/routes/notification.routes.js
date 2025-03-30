const express = require('express');
const { query } = require('express-validator');
const NotificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const listNotificationsValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

// Routes
router.get('/', authMiddleware, listNotificationsValidation, NotificationController.getUserNotifications);

module.exports = router;
