const { validationResult } = require('express-validator');
const Event = require('../models/event.model');
const redisClient = require('../config/redis');

class EventController {
  static async create(req, res, next) {
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

      const eventData = {
        ...req.body,
        creatorId: req.user.id
      };

      const event = await Event.create(eventData);

      // Publish event creation notification
      await redisClient.publish('events', JSON.stringify({
        type: 'event_created',
        data: event
      }));

      res.status(201).json({
        message: req.t('events.created'),
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  static async search(req, res, next) {
    try {
      const {
        latitude,
        longitude,
        radius,
        categoryId,
        startDate,
        endDate,
        limit,
        offset
      } = req.query;

      const events = await Event.search({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        categoryId: categoryId ? parseInt(categoryId) : null,
        startDate,
        endDate,
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0
      });

      res.json({
        message: req.t('events.search_results'),
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_found')
          }
        });
      }

      res.json({
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
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

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_found')
          }
        });
      }

      // Check if user is the creator
      if (event.creator_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: req.t('error.forbidden')
          }
        });
      }

      const updatedEvent = await Event.update(req.params.id, req.body);

      // Publish event update notification
      await redisClient.publish('events', JSON.stringify({
        type: 'event_updated',
        data: updatedEvent
      }));

      res.json({
        message: req.t('events.updated'),
        data: updatedEvent
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_found')
          }
        });
      }

      // Check if user is the creator
      if (event.creator_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: req.t('error.forbidden')
          }
        });
      }

      await Event.delete(req.params.id);

      // Publish event deletion notification
      await redisClient.publish('events', JSON.stringify({
        type: 'event_deleted',
        data: { id: req.params.id }
      }));

      res.json({
        message: req.t('events.deleted')
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_found')
          }
        });
      }

      const registration = await Event.registerParticipant(req.params.id, req.user.id);

      // Publish registration notification
      await redisClient.publish('events', JSON.stringify({
        type: 'event_registration',
        data: {
          eventId: req.params.id,
          userId: req.user.id,
          status: registration.status
        }
      }));

      res.json({
        message: req.t('events.registration_success'),
        data: registration
      });
    } catch (error) {
      next(error);
    }
  }

  static async unregister(req, res, next) {
    try {
      const result = await Event.unregisterParticipant(req.params.id, req.user.id);
      if (!result) {
        return res.status(404).json({
          error: {
            message: req.t('events.not_registered')
          }
        });
      }

      // Publish unregistration notification
      await redisClient.publish('events', JSON.stringify({
        type: 'event_unregistration',
        data: {
          eventId: req.params.id,
          userId: req.user.id
        }
      }));

      res.json({
        message: req.t('events.unregistration_success')
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
