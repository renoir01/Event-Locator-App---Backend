const db = require('../config/database');

class Event {
  static async create({ title, description, latitude, longitude, startDate, endDate, creatorId, categoryId, address, maxParticipants }) {
    const query = `
      INSERT INTO events (
        title, description, location, start_date, end_date,
        creator_id, category_id, address, max_participants
      )
      VALUES (
        $1, $2, ST_SetSRID(ST_GeomFromText($3), 4326)::geography,
        $4, $5, $6, $7, $8, $9
      )
      RETURNING id, title, description,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        start_date, end_date, creator_id, category_id,
        address, max_participants, created_at`;

    const point = `POINT(${longitude} ${latitude})`;
    const values = [
      title, description, point, startDate, endDate,
      creatorId, categoryId, address, maxParticipants
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT e.*,
        ST_X(e.location::geometry) as longitude,
        ST_Y(e.location::geometry) as latitude,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        u.name as creator_name,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.status = 'registered') as participant_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.id = $1`;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async search({ latitude, longitude, radius = 10, categoryId, startDate, endDate, limit = 10, offset = 0 }) {
    let query = `
      SELECT e.*,
        ST_X(e.location::geometry) as longitude,
        ST_Y(e.location::geometry) as latitude,
        c.name_en as category_name_en,
        c.name_rw as category_name_rw,
        u.name as creator_name,
        ST_Distance(
          e.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE ST_DWithin(
        e.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3 * 1000
      )`;

    const params = [longitude, latitude, radius];
    let paramCount = 3;

    if (categoryId) {
      query += ` AND e.category_id = $${++paramCount}`;
      params.push(categoryId);
    }

    if (startDate) {
      query += ` AND e.start_date >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND e.end_date <= $${++paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY distance_km ASC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    return rows;
  }

  static async update(id, { title, description, latitude, longitude, startDate, endDate, categoryId, address, maxParticipants }) {
    const updates = [];
    const values = [id];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${++paramCount}`);
      values.push(title);
    }

    if (description) {
      updates.push(`description = $${++paramCount}`);
      values.push(description);
    }

    if (latitude && longitude) {
      updates.push(`location = ST_SetSRID(ST_GeomFromText($${++paramCount}), 4326)::geography`);
      values.push(`POINT(${longitude} ${latitude})`);
    }

    if (startDate) {
      updates.push(`start_date = $${++paramCount}`);
      values.push(startDate);
    }

    if (endDate) {
      updates.push(`end_date = $${++paramCount}`);
      values.push(endDate);
    }

    if (categoryId) {
      updates.push(`category_id = $${++paramCount}`);
      values.push(categoryId);
    }

    if (address) {
      updates.push(`address = $${++paramCount}`);
      values.push(address);
    }

    if (maxParticipants) {
      updates.push(`max_participants = $${++paramCount}`);
      values.push(maxParticipants);
    }

    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, title, description,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        start_date, end_date, category_id,
        address, max_participants, updated_at`;

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async registerParticipant(eventId, userId) {
    // Check if event has space
    const event = await this.findById(eventId);
    const status = event.participant_count >= event.max_participants ? 'waitlisted' : 'registered';

    const query = `
      INSERT INTO event_participants (event_id, user_id, status)
      VALUES ($1, $2, $3)
      RETURNING event_id, user_id, status, registration_date`;

    const { rows } = await db.query(query, [eventId, userId, status]);
    return rows[0];
  }

  static async unregisterParticipant(eventId, userId) {
    const query = `
      DELETE FROM event_participants
      WHERE event_id = $1 AND user_id = $2
      RETURNING event_id`;

    const { rows } = await db.query(query, [eventId, userId]);
    return rows[0];
  }
}

module.exports = Event;
