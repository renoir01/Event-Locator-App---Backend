const { validationResult } = require('express-validator');
const Rating = require('../models/rating.model');
const Event = require('../models/event.model');
const redisClient = require('../config/redis');

class RatingController {
  static async createOrUpdate(req, res, next) {
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

      const eventId = parseInt(req.params.eventId);
      const userId = req.user.id;

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_found')
          }
        });
      }

      // Check if user participated in the event
      const hasParticipated = await Rating.checkUserParticipation(eventId, userId);
      if (!hasParticipated) {
        return res.status(403).json({
          error: {
            message: req.t('ratings.not_participated')
          }
        });
      }

      // Check if user already rated
      const existingRating = await Rating.getUserRating(eventId, userId);
      
      let rating;
      if (existingRating) {
        rating = await Rating.update({
          eventId,
          userId,
          rating: req.body.rating,
          review: req.body.review
        });
      } else {
        rating = await Rating.create({
          eventId,
          userId,
          rating: req.body.rating,
          review: req.body.review
        });
      }

      // Get updated stats
      const stats = await Rating.getEventStats(eventId);

      // Publish rating update notification
      await redisClient.publish('events', JSON.stringify({
        type: existingRating ? 'rating_updated' : 'rating_created',
        data: {
          eventId,
          userId,
          rating: rating.rating,
          stats
        }
      }));

      res.status(existingRating ? 200 : 201).json({
        message: req.t(existingRating ? 'ratings.updated' : 'ratings.created'),
        data: {
          rating,
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEventRatings(req, res, next) {
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

      const eventId = parseInt(req.params.eventId);
      const { limit, offset } = req.query;

      const [ratings, stats] = await Promise.all([
        Rating.getByEventId(eventId, {
          limit: parseInt(limit) || 10,
          offset: parseInt(offset) || 0
        }),
        Rating.getEventStats(eventId)
      ]);

      res.json({
        data: {
          ratings: ratings.map(rating => ({
            ...rating,
            isCurrentUser: rating.user_id === req.user?.id
          })),
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRating(req, res, next) {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user.id;

      const rating = await Rating.getUserRating(eventId, userId);
      if (!rating) {
        return res.status(404).json({
          error: {
            message: req.t('ratings.not_found')
          }
        });
      }

      await Rating.delete(eventId, userId);

      // Get updated stats
      const stats = await Rating.getEventStats(eventId);

      // Publish rating deletion notification
      await redisClient.publish('events', JSON.stringify({
        type: 'rating_deleted',
        data: {
          eventId,
          userId,
          stats
        }
      }));

      res.json({
        message: req.t('ratings.deleted'),
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserRating(req, res, next) {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user.id;

      const rating = await Rating.getUserRating(eventId, userId);
      if (!rating) {
        return res.status(404).json({
          error: {
            message: req.t('ratings.not_found')
          }
        });
      }

      res.json({
        data: rating
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RatingController;
