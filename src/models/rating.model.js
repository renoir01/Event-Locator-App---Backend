const db = require('../config/database');

class Rating {
  static async create({ eventId, userId, rating, review }) {
    const query = `
      INSERT INTO event_ratings (event_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      RETURNING id, event_id, user_id, rating, review, created_at`;

    const { rows } = await db.query(query, [eventId, userId, rating, review]);
    return rows[0];
  }

  static async update({ eventId, userId, rating, review }) {
    const query = `
      UPDATE event_ratings
      SET rating = $1, review = $2
      WHERE event_id = $3 AND user_id = $4
      RETURNING id, event_id, user_id, rating, review, created_at`;

    const { rows } = await db.query(query, [rating, review, eventId, userId]);
    return rows[0];
  }

  static async getByEventId(eventId, { limit = 10, offset = 0 }) {
    const query = `
      SELECT 
        er.*,
        u.name as reviewer_name,
        u.preferred_language
      FROM event_ratings er
      JOIN users u ON er.user_id = u.id
      WHERE er.event_id = $1
      ORDER BY er.created_at DESC
      LIMIT $2 OFFSET $3`;

    const { rows } = await db.query(query, [eventId, limit, offset]);
    return rows;
  }

  static async getEventStats(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total_ratings,
        ROUND(AVG(rating), 1) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM event_ratings
      WHERE event_id = $1`;

    const { rows } = await db.query(query, [eventId]);
    return rows[0];
  }

  static async getUserRating(eventId, userId) {
    const query = `
      SELECT id, rating, review, created_at
      FROM event_ratings
      WHERE event_id = $1 AND user_id = $2`;

    const { rows } = await db.query(query, [eventId, userId]);
    return rows[0];
  }

  static async delete(eventId, userId) {
    const query = `
      DELETE FROM event_ratings
      WHERE event_id = $1 AND user_id = $2
      RETURNING id`;

    const { rows } = await db.query(query, [eventId, userId]);
    return rows[0];
  }

  static async checkUserParticipation(eventId, userId) {
    const query = `
      SELECT 1
      FROM event_participants
      WHERE event_id = $1 AND user_id = $2 AND status = 'registered'`;

    const { rows } = await db.query(query, [eventId, userId]);
    return rows.length > 0;
  }
}
