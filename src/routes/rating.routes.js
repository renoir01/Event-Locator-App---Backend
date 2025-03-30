const express = require('express');
const { body, query } = require('express-validator');
const RatingController = require('../controllers/rating.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true }); // Enable access to parent route parameters

// Validation middleware
const createRatingValidation = [
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().trim().isLength({ min: 1, max: 1000 })
];

const listRatingsValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

// Routes
router.post('/', authMiddleware, createRatingValidation, RatingController.createOrUpdate);
router.get('/', listRatingsValidation, RatingController.getEventRatings);
router.get('/user', authMiddleware, RatingController.getUserRating);
router.delete('/', authMiddleware, RatingController.deleteRating);

module.exports = router;
