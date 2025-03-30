const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, name, preferredLanguage = 'en', latitude, longitude }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const location = latitude && longitude ? `POINT(${longitude} ${latitude})` : null;

    const query = `
      INSERT INTO users (email, password_hash, name, preferred_language, location)
      VALUES ($1, $2, $3, $4, ${location ? `ST_SetSRID(ST_GeomFromText($5), 4326)::geography` : 'NULL'})
      RETURNING id, email, name, preferred_language, created_at`;

    const values = location 
      ? [email, passwordHash, name, preferredLanguage, location]
      : [email, passwordHash, name, preferredLanguage];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, name, preferred_language,
             ST_X(location::geometry) as longitude,
             ST_Y(location::geometry) as latitude,
             created_at, updated_at
      FROM users
      WHERE email = $1`;

    const { rows } = await db.query(query, [email]);
    return rows[0];
  }

  static async updateLocation(userId, latitude, longitude) {
    const query = `
      UPDATE users
      SET location = ST_SetSRID(ST_GeomFromText($1), 4326)::geography
      WHERE id = $2
      RETURNING id`;

    const point = `POINT(${longitude} ${latitude})`;
    const { rows } = await db.query(query, [point, userId]);
    return rows[0];
  }

  static async validatePassword(providedPassword, storedHash) {
    return bcrypt.compare(providedPassword, storedHash);
  }
}
