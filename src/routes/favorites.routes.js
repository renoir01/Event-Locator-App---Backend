const express = require('express');
const { param } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const FavoritesController = require('../controllers/favorites.controller');

const router = express.Router();

// Validation middleware
const eventIdValidation = [
  param('eventId').isInt().withMessage('Event ID must be an integer')
];

// Routes
router.get('/', authMiddleware, FavoritesController.getFavorites);
router.post('/:eventId', authMiddleware, eventIdValidation, FavoritesController.addFavorite);
router.delete('/:eventId', authMiddleware, eventIdValidation, FavoritesController.removeFavorite);

module.exports = router;
