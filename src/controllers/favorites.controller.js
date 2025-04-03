const { validationResult } = require('express-validator');
const db = require('../config/database');
const i18next = require('i18next');

/**
 * Get all favorite events for the authenticated user
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    // Query to get all favorite events with event details
    const query = `
      SELECT e.* 
      FROM events e
      JOIN favorite_events fe ON e.id = fe.event_id
      WHERE fe.user_id = $1
      ORDER BY e.start_date ASC
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    // Calculate average rating for each event
    const eventsWithRatings = await Promise.all(rows.map(async (event) => {
      const ratingQuery = `
        SELECT AVG(rating) as average_rating, COUNT(*) as rating_count
        FROM event_ratings
        WHERE event_id = $1
      `;
      const ratingResult = await db.query(ratingQuery, [event.id]);
      
      return {
        ...event,
        average_rating: ratingResult.rows[0].average_rating ? parseFloat(ratingResult.rows[0].average_rating).toFixed(1) : null,
        rating_count: parseInt(ratingResult.rows[0].rating_count)
      };
    }));

    return res.status(200).json({
      success: true,
      favorites: eventsWithRatings
    });
  } catch (error) {
    console.error('Error fetching favorite events:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: i18next.t('errors.server_error', { ns: 'api' })
      }
    });
  }
};

/**
 * Add an event to user's favorites
 */
exports.addFavorite = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: i18next.t('errors.invalid_input', { ns: 'api' }),
          details: errors.array()
        }
      });
    }

    const userId = req.user.id;
    const eventId = req.params.eventId;

    // Check if event exists
    const eventQuery = 'SELECT id FROM events WHERE id = $1';
    const eventResult = await db.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: i18next.t('errors.event_not_found', { ns: 'api' })
        }
      });
    }

    // Check if already in favorites
    const checkQuery = 'SELECT * FROM favorite_events WHERE user_id = $1 AND event_id = $2';
    const checkResult = await db.query(checkQuery, [userId, eventId]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: i18next.t('errors.already_favorite', { ns: 'api' })
        }
      });
    }

    // Add to favorites
    const insertQuery = 'INSERT INTO favorite_events (user_id, event_id) VALUES ($1, $2) RETURNING *';
    await db.query(insertQuery, [userId, eventId]);

    return res.status(201).json({
      success: true,
      message: i18next.t('success.favorite_added', { ns: 'api' })
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: i18next.t('errors.server_error', { ns: 'api' })
      }
    });
  }
};

/**
 * Remove an event from user's favorites
 */
exports.removeFavorite = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: i18next.t('errors.invalid_input', { ns: 'api' }),
          details: errors.array()
        }
      });
    }

    const userId = req.user.id;
    const eventId = req.params.eventId;

    // Check if in favorites
    const checkQuery = 'SELECT * FROM favorite_events WHERE user_id = $1 AND event_id = $2';
    const checkResult = await db.query(checkQuery, [userId, eventId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: i18next.t('errors.not_favorite', { ns: 'api' })
        }
      });
    }

    // Remove from favorites
    const deleteQuery = 'DELETE FROM favorite_events WHERE user_id = $1 AND event_id = $2';
    await db.query(deleteQuery, [userId, eventId]);

    return res.status(200).json({
      success: true,
      message: i18next.t('success.favorite_removed', { ns: 'api' })
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: i18next.t('errors.server_error', { ns: 'api' })
      }
    });
  }
};
