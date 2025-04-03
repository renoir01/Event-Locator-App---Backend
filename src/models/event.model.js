const db = require('../config/database');

class Event {
  static async create({ title, description, latitude, longitude, startDate, endDate, creatorId, categoryId, address, maxParticipants }) {
    try {
      // Validate inputs
      if (!title || !description || !latitude || !longitude || !startDate || !endDate || !creatorId || !categoryId || !address) {
        throw new Error('Missing required event fields');
      }

      // Ensure latitude and longitude are valid numbers
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid latitude or longitude values');
      }

      const query = `
        INSERT INTO events (
          title, description, location, start_date, end_date,
          creator_id, category_id, address, max_participants
        )
        VALUES (
          $1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6, $7, $8, $9, $10
        )
        RETURNING id, title, description, 
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          start_date, end_date, creator_id, category_id,
          address, max_participants, created_at`;

      const values = [
        title, description, lat, lng, startDate, endDate,
        creatorId, categoryId, address, maxParticipants
      ];

      const { rows } = await db.query(query, values);
      if (rows.length === 0) {
        throw new Error('Failed to create event');
      }
      return rows[0];
    } catch (error) {
      console.error('Event creation error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT e.id, e.title, e.description, 
        ST_X(e.location::geometry) as longitude,
        ST_Y(e.location::geometry) as latitude,
        e.start_date, e.end_date, e.creator_id, e.category_id,
        e.address, e.max_participants, e.created_at, e.updated_at,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        u.name as creator_name,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.id = $1`;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async search({ latitude, longitude, radius = 10, categoryId, startDate, endDate, limit = 10, offset = 0 }) {
    let query = `
      SELECT e.id, e.title, e.description, 
        ST_X(e.location::geometry) as longitude,
        ST_Y(e.location::geometry) as latitude,
        e.start_date, e.end_date, e.creator_id, e.category_id,
        e.address, e.max_participants, e.created_at, e.updated_at,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        u.name as creator_name,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE 1=1`;

    const values = [];
    let paramIndex = 1;

    // Add location-based search if coordinates are provided
    if (latitude && longitude && radius) {
      query += ` AND ST_DWithin(
        e.location,
        ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geography,
        $${paramIndex + 2} * 1000
      )`;
      values.push(latitude, longitude, radius);
      paramIndex += 3;

      // Add distance calculation for sorting
      query += `, ST_Distance(
        e.location,
        ST_SetSRID(ST_MakePoint($${paramIndex - 2}, $${paramIndex - 3}), 4326)::geography
      ) as distance`;
    }

    // Add category filter
    if (categoryId) {
      query += ` AND e.category_id = $${paramIndex}`;
      values.push(categoryId);
      paramIndex++;
    }

    // Add date range filter
    if (startDate) {
      query += ` AND e.start_date >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND e.end_date <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }

    // Add ordering
    if (latitude && longitude && radius) {
      query += ` ORDER BY distance ASC`;
    } else {
      query += ` ORDER BY e.start_date ASC`;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async update(id, { title, description, latitude, longitude, startDate, endDate, categoryId, address, maxParticipants }) {
    const query = `
      UPDATE events
      SET title = $1,
          description = $2,
          location = ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
          start_date = $5,
          end_date = $6,
          category_id = $7,
          address = $8,
          max_participants = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, title, description, 
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        start_date, end_date, creator_id, category_id,
        address, max_participants, updated_at`;

    const values = [
      title, description, latitude, longitude, startDate, endDate,
      categoryId, address, maxParticipants, id
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async registerParticipant(eventId, userId) {
    try {
      // First check if the event exists and has space available
      const checkQuery = `
        SELECT e.id, e.max_participants, 
          (SELECT COUNT(*) FROM event_participants WHERE event_id = $1 AND status = 'registered') as current_participants
        FROM events e
        WHERE e.id = $1`;
      
      const checkResult = await db.query(checkQuery, [eventId]);
      if (checkResult.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      const event = checkResult.rows[0];
      
      // Check if the event has reached maximum capacity
      if (event.max_participants !== null && 
          parseInt(event.current_participants) >= event.max_participants) {
        throw new Error('Event is at full capacity');
      }
      
      // Check if user is already registered
      const checkRegistrationQuery = `
        SELECT 1 FROM event_participants 
        WHERE event_id = $1 AND user_id = $2`;
      
      const registrationCheck = await db.query(checkRegistrationQuery, [eventId, userId]);
      if (registrationCheck.rows.length > 0) {
        throw new Error('User already registered for this event');
      }
      
      // Register the user for the event
      const query = `
        INSERT INTO event_participants (event_id, user_id, status)
        VALUES ($1, $2, 'registered')
        RETURNING event_id, user_id, status, registration_date as registration_date`;

      const { rows } = await db.query(query, [eventId, userId]);
      if (rows.length === 0) {
        throw new Error('Failed to register for event');
      }
      return rows[0];
    } catch (error) {
      console.error('Event registration error:', error.message);
      throw error;
    }
  }

  static async unregisterParticipant(eventId, userId) {
    const query = `
      DELETE FROM event_participants
      WHERE event_id = $1 AND user_id = $2
      RETURNING event_id`;

    const { rows } = await db.query(query, [eventId, userId]);
    return rows[0];
  }

  static async getParticipants(eventId) {
    const query = `
      SELECT u.id, u.name, u.email, ep.registration_date as registered_at
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = $1
      ORDER BY ep.registration_date ASC`;

    const { rows } = await db.query(query, [eventId]);
    return rows;
  }

  static async getUserEvents(userId) {
    const query = `
      SELECT e.*,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.creator_id = $1
      ORDER BY e.start_date ASC`;

    const { rows } = await db.query(query, [userId]);
    return rows;
  }

  static async getUserRegisteredEvents(userId) {
    const query = `
      SELECT e.*,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        ep.created_at as registered_at
      FROM event_participants ep
      JOIN events e ON ep.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE ep.user_id = $1
      ORDER BY e.start_date ASC`;

    const { rows } = await db.query(query, [userId]);
    return rows;
  }

  /**
   * Execute a custom search query with provided parameters
   * @param {string} query - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Array>} Array of event objects
   */
  static async searchWithQuery(query, params) {
    try {
      const { rows } = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error executing search query:', error);
      throw error;
    }
  }
}

module.exports = Event;
