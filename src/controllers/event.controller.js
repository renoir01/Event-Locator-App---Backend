const { validationResult } = require('express-validator');
const Event = require('../models/event.model');
const redisClient = require('../config/redis');
const db = require('../config/database');

class EventController {
  static async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('validation.error') : 'Validation error',
            details: errors.array()
          }
        });
      }

      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: {
            message: req.t ? req.t('auth.unauthorized') : 'Authentication required'
          }
        });
      }

      // Ensure categoryId is an integer
      const eventData = {
        ...req.body,
        creatorId: req.user.id,
        categoryId: parseInt(req.body.categoryId, 10)
      };

      console.log('Creating event with data:', JSON.stringify(eventData));

      const event = await Event.create(eventData);

      // Try to publish event creation notification, but don't fail if Redis is unavailable
      try {
        await redisClient.publish('events', JSON.stringify({
          type: 'event_created',
          data: event
        }));
      } catch (redisError) {
        console.warn('Redis notification failed, but event was created:', redisError.message);
        // Continue without Redis notification
      }

      res.status(201).json({
        message: req.t ? req.t('events.created') : 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('Error creating event:', error.message, error.stack);
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
        limit = 10,
        offset = 0
      } = req.query;

      console.log('Search params:', req.query);

      // Start building the query
      let query = `
        SELECT 
          e.id, 
          e.title, 
          e.description, 
          e.start_date, 
          e.end_date, 
          e.creator_id, 
          e.category_id,
          e.address, 
          e.max_participants, 
          e.created_at, 
          e.updated_at,
          c.name_en AS category_name_en, 
          c.name_rw AS category_name_rw,
          u.name AS creator_name,
          ST_X(e.location::geometry) AS longitude,
          ST_Y(e.location::geometry) AS latitude`;

      // Add distance calculation if coordinates are provided
      if (latitude && longitude && radius) {
        query += `,
          ST_Distance(
            e.location, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance`;
      }

      // Continue with FROM and JOIN clauses
      query += `
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE 1=1`;

      // Initialize parameters array
      const params = [];
      let paramIndex = 1;

      // Add location parameters first if they exist
      if (latitude && longitude && radius) {
        params.push(parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
        query += ` AND ST_DWithin(
          e.location, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )`;
        paramIndex = 4;
      }

      // Add category filter
      if (categoryId) {
        query += ` AND e.category_id = $${paramIndex}`;
        params.push(parseInt(categoryId, 10));
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        query += ` AND e.start_date >= $${paramIndex}`;
        params.push(new Date(startDate));
        paramIndex++;
      }

      if (endDate) {
        query += ` AND e.end_date <= $${paramIndex}`;
        params.push(new Date(endDate));
        paramIndex++;
      }

      // Add ordering - by distance if coordinates provided, otherwise by start date
      if (latitude && longitude && radius) {
        query += ` ORDER BY distance ASC`;
      } else {
        query += ` ORDER BY e.start_date ASC`;
      }

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      console.log('Final query:', query);
      console.log('Params:', params);

      const events = await Event.searchWithQuery(query, params);
      
      return res.success(
        req.t ? req.t('events.search_success') : 'Events retrieved successfully',
        { events, total: events.length }
      );
    } catch (error) {
      console.error('Search error:', error);
      return res.error(
        req.t ? req.t('error.search') : 'An error occurred while searching for events',
        'SEARCH_ERROR',
        process.env.NODE_ENV === 'development' ? error.message : undefined,
        500
      );
    }
  }

  static async getById(req, res, next) {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('events.not_found') : 'Event not found'
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
            message: req.t ? req.t('validation.error') : 'Validation error',
            details: errors.array()
          }
        });
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('events.not_found') : 'Event not found'
          }
        });
      }

      if (event.creator_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: req.t ? req.t('error.forbidden') : 'Forbidden'
          }
        });
      }

      const updatedEvent = await Event.update(req.params.id, req.body);

      // Try to publish event update notification, but don't fail if Redis is unavailable
      try {
        await redisClient.publish('events', JSON.stringify({
          type: 'event_updated',
          data: updatedEvent
        }));
      } catch (redisError) {
        console.warn('Redis notification failed, but event was updated:', redisError.message);
        // Continue without Redis notification
      }

      res.json({
        message: req.t ? req.t('events.updated') : 'Event updated successfully',
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
            message: req.t ? req.t('events.not_found') : 'Event not found'
          }
        });
      }

      if (event.creator_id !== req.user.id) {
        return res.status(403).json({
          error: {
            message: req.t ? req.t('error.forbidden') : 'Forbidden'
          }
        });
      }

      await Event.delete(req.params.id);

      // Try to publish event deletion notification, but don't fail if Redis is unavailable
      try {
        await redisClient.publish('events', JSON.stringify({
          type: 'event_deleted',
          data: { id: req.params.id }
        }));
      } catch (redisError) {
        console.warn('Redis notification failed, but event was deleted:', redisError.message);
        // Continue without Redis notification
      }

      res.json({
        message: req.t ? req.t('events.deleted') : 'Event deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: {
            message: req.t ? req.t('auth.unauthorized') : 'Authentication required'
          }
        });
      }

      const eventId = req.params.id;
      const userId = req.user.id;

      console.log(`Attempting to register user ${userId} for event ${eventId}`);

      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('events.not_found') : 'Event not found'
          }
        });
      }

      // Register the user
      const registration = await Event.registerParticipant(eventId, userId);

      // Try to publish registration notification, but don't fail if Redis is unavailable
      try {
        const notificationData = JSON.stringify({
          type: 'user_registered',
          data: {
            eventId,
            userId,
            eventTitle: event.title
          }
        });
        await redisClient.publish('events', notificationData);
      } catch (redisError) {
        console.warn('Redis notification failed, but registration was successful:', redisError.message);
        // Continue without Redis notification
      }

      res.status(201).json({
        message: req.t ? req.t('events.registered') : 'Successfully registered for event',
        data: registration
      });
    } catch (error) {
      console.error('Registration error:', error.message);
      
      // Handle specific errors with appropriate responses
      if (error.message === 'Event is at full capacity') {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('events.full_capacity') : 'Event is at full capacity'
          }
        });
      } else if (error.message === 'User already registered for this event') {
        return res.status(400).json({
          error: {
            message: req.t ? req.t('events.already_registered') : 'User already registered for this event'
          }
        });
      }
      
      next(error);
    }
  }

  static async unregister(req, res, next) {
    try {
      const result = await Event.unregisterParticipant(req.params.id, req.user.id);
      if (!result) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('events.not_registered') : 'Not registered'
          }
        });
      }

      // Try to publish unregistration notification, but don't fail if Redis is unavailable
      try {
        await redisClient.publish('events', JSON.stringify({
          type: 'event_unregistration',
          data: { eventId: req.params.id, userId: req.user.id }
        }));
      } catch (redisError) {
        console.warn('Redis notification failed, but unregistration was successful:', redisError.message);
        // Continue without Redis notification
      }

      res.json({
        message: req.t ? req.t('events.unregistration_success') : 'Unregistration successful'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
