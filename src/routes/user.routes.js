const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const updatePreferencesValidation = [
  body('categoryId').isInt(),
  body('notificationRadius').isFloat({ min: 0 })
];

// Routes
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/preferences', authMiddleware, updatePreferencesValidation, UserController.updatePreferences);
router.get('/events', authMiddleware, UserController.getRegisteredEvents);

module.exports = router;
