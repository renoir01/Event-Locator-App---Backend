const express = require('express');
const { body, oneOf } = require('express-validator');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const updateProfileValidation = [
  body('name').optional().isString().isLength({ min: 2, max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'rw']),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 })
];

const updatePreferencesValidation = [
  oneOf([
    body('categoryIds').isArray({ min: 1 }).withMessage('At least one category must be selected'),
    body('preferredCategories').isArray({ min: 1 }).withMessage('At least one category must be selected')
  ]),
  body('categoryIds.*').optional().isInt().withMessage('Category IDs must be integers'),
  body('preferredCategories.*').optional().isInt().withMessage('Category IDs must be integers'),
  body('notificationRadius').isFloat({ min: 0.1, max: 100 }).withMessage('Notification radius must be between 0.1 and 100 km')
];

// User profile routes
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, updateProfileValidation, UserController.updateProfile);

// User preferences routes
router.get('/preferences', authMiddleware, UserController.getPreferences);
router.put('/preferences', authMiddleware, updatePreferencesValidation, UserController.updatePreferences);

// User events routes
router.get('/events/registered', authMiddleware, UserController.getRegisteredEvents);
router.get('/events/favorites', authMiddleware, UserController.getFavoriteEvents);
router.post('/events/:eventId/favorite', authMiddleware, UserController.addFavoriteEvent);
router.delete('/events/:eventId/favorite', authMiddleware, UserController.removeFavoriteEvent);

module.exports = router;
