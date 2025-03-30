const express = require('express');
const { body, query } = require('express-validator');
const EventController = require('../controllers/event.controller');
const authMiddleware = require('../middleware/auth.middleware');
const ratingRoutes = require('./rating.routes');

const router = express.Router();

// Validation middleware
const createEventValidation = [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('startDate').isISO8601(),
  body('endDate').isISO8601().custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  body('categoryId').isInt(),
  body('address').trim().notEmpty(),
  body('maxParticipants').isInt({ min: 1 })
];

const updateEventValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601().custom((value, { req }) => {
    if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  }),
  body('categoryId').optional().isInt(),
  body('address').optional().trim().notEmpty(),
  body('maxParticipants').optional().isInt({ min: 1 })
];

const searchValidation = [
  query('latitude').isFloat({ min: -90, max: 90 }),
  query('longitude').isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0 }),
  query('categoryId').optional().isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

// Routes
router.post('/', authMiddleware, createEventValidation, EventController.create);
router.get('/search', searchValidation, EventController.search);
router.get('/:id', EventController.getById);
router.put('/:id', authMiddleware, updateEventValidation, EventController.update);
router.delete('/:id', authMiddleware, EventController.delete);
router.post('/:id/register', authMiddleware, EventController.register);
router.delete('/:id/register', authMiddleware, EventController.unregister);

// Ratings routes
router.use('/:eventId/ratings', ratingRoutes);

module.exports = router;
