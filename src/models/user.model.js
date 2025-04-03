const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// PostGIS is available in our environment
const postgisAvailable = true;

class User {
  static async create({ email, password, name, preferredLanguage, latitude, longitude }) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Use PostGIS geography type
    const query = `
      INSERT INTO users (email, password_hash, name, preferred_language, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
      RETURNING id, email, name, preferred_language, 
        ST_X(location::geometry) as longitude, 
        ST_Y(location::geometry) as latitude, 
        created_at`;
    const values = [email, passwordHash, name, preferredLanguage || 'en', longitude, latitude];

    const { rows } = await db.query(query, values);
    
    // Create default preferences
    try {
      // Check if user_preferences table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_preferences'
        )`);
        
      if (tableCheck.rows[0].exists) {
        // Get the column names from user_preferences table
        const columnCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_preferences'
        `);
        
        const columns = columnCheck.rows.map(row => row.column_name);
        
        // Check if category_id column exists
        if (columns.includes('category_id')) {
          // Default to Music category (ID: 1)
          await db.query(
            `INSERT INTO user_preferences (user_id, notification_radius, category_id) 
             VALUES ($1, $2, $3)`,
            [rows[0].id, 5.0, 1] // Default 5km radius and Music category
          );
        } else {
          // Insert user preferences without category_id
          await db.query(
            `INSERT INTO user_preferences (user_id, notification_radius) 
             VALUES ($1, $2)`,
            [rows[0].id, 5.0] // Default 5km radius
          );
        }
      }
      
      // Check if user_category_preferences table exists
      const categoryTableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_category_preferences'
        )`);
        
      if (categoryTableCheck.rows[0].exists) {
        // Insert default category preference (Music - ID: 1)
        await db.query(
          `INSERT INTO user_category_preferences (user_id, category_id) 
           VALUES ($1, $2)`,
          [rows[0].id, 1]
        );
      }
    } catch (error) {
      console.error('Error creating default preferences:', error);
      // Continue with user creation even if preferences fail
    }
    
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

  static async findById(id) {
    const query = `
      SELECT id, email, name, preferred_language, 
        ST_X(location::geometry) as longitude, 
        ST_Y(location::geometry) as latitude, 
        created_at 
      FROM users 
      WHERE id = $1`;
    
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async updateLocation(userId, latitude, longitude) {
    const query = `
      UPDATE users
      SET location = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, preferred_language, 
        ST_X(location::geometry) as longitude, 
        ST_Y(location::geometry) as latitude, 
        created_at`;
    
    const { rows } = await db.query(query, [userId, latitude, longitude]);
    return rows[0];
  }

  static async updateLanguage(userId, preferredLanguage) {
    const query = `
      UPDATE users
      SET preferred_language = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, preferred_language, 
        ST_X(location::geometry) as longitude, 
        ST_Y(location::geometry) as latitude, 
        created_at`;

    const { rows } = await db.query(query, [userId, preferredLanguage]);
    return rows[0];
  }

  static async getPreferences(userId) {
    // Get user notification radius
    const radiusQuery = `
      SELECT notification_radius 
      FROM user_preferences 
      WHERE user_id = $1`;
    
    const radiusResult = await db.query(radiusQuery, [userId]);
    const notificationRadius = radiusResult.rows.length > 0 
      ? radiusResult.rows[0].notification_radius 
      : 5.0; // Default to 5km
    
    // Get user category preferences
    const categoriesQuery = `
      SELECT c.id, c.name_en, c.name_rw
      FROM user_category_preferences ucp
      JOIN categories c ON ucp.category_id = c.id
      WHERE ucp.user_id = $1`;
    
    const categoriesResult = await db.query(categoriesQuery, [userId]);
    
    return {
      notificationRadius,
      categories: categoriesResult.rows
    };
  }

  static async updatePreferences(userId, { categoryIds, notificationRadius }) {
    try {
      // Begin transaction
      await db.query('BEGIN');
      
      // Get the first category ID (required for user_preferences table)
      const defaultCategoryId = categoryIds && categoryIds.length > 0 ? categoryIds[0] : 1;
      
      // Check if user already has preferences
      const checkQuery = `SELECT 1 FROM user_preferences WHERE user_id = $1`;
      const checkResult = await db.query(checkQuery, [userId]);
      
      if (checkResult.rows.length > 0) {
        // Update existing preferences
        const updateQuery = `
          UPDATE user_preferences
          SET notification_radius = $2, category_id = $3
          WHERE user_id = $1`;
        
        await db.query(updateQuery, [userId, notificationRadius, defaultCategoryId]);
      } else {
        // Create new preferences
        const insertQuery = `
          INSERT INTO user_preferences (user_id, notification_radius, category_id)
          VALUES ($1, $2, $3)`;
        
        await db.query(insertQuery, [userId, notificationRadius, defaultCategoryId]);
      }
      
      // Delete existing category preferences
      await db.query(`DELETE FROM user_category_preferences WHERE user_id = $1`, [userId]);
      
      // Insert new category preferences
      for (const categoryId of categoryIds) {
        await db.query(
          `INSERT INTO user_category_preferences (user_id, category_id) VALUES ($1, $2)`,
          [userId, categoryId]
        );
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Get updated preferences
      return await User.getPreferences(userId);
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  static async getFavoriteEvents(userId) {
    let query;
    
    if (postgisAvailable) {
      query = `
        SELECT e.*, 
          ST_X(e.location::geometry) as longitude, 
          ST_Y(e.location::geometry) as latitude,
          c.name_en as category_name_en, c.name_rw as category_name_rw, u.name as creator_name
        FROM favorite_events fe
        JOIN events e ON fe.event_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE fe.user_id = $1
        ORDER BY fe.created_at DESC`;
    } else {
      query = `
        SELECT e.*, c.name_en as category_name_en, c.name_rw as category_name_rw, u.name as creator_name
        FROM favorite_events fe
        JOIN events e ON fe.event_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE fe.user_id = $1
        ORDER BY fe.created_at DESC`;
    }

    const { rows } = await db.query(query, [userId]);
    return rows;
  }

  static async addFavoriteEvent(userId, eventId) {
    // First check if event exists
    const checkEvent = `SELECT 1 FROM events WHERE id = $1`;
    const eventExists = await db.query(checkEvent, [eventId]);
    
    if (eventExists.rows.length === 0) {
      throw new Error('Event not found');
    }
    
    const query = `
      INSERT INTO favorite_events (user_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, event_id) DO NOTHING
      RETURNING *`;

    const { rows } = await db.query(query, [userId, eventId]);
    return rows[0];
  }

  static async removeFavoriteEvent(userId, eventId) {
    const query = `
      DELETE FROM favorite_events
      WHERE user_id = $1 AND event_id = $2
      RETURNING *`;

    const { rows } = await db.query(query, [userId, eventId]);
    return rows[0];
  }
  
  static async getRegisteredEvents(userId) {
    let query;
    
    if (postgisAvailable) {
      query = `
        SELECT e.*, 
          ST_X(e.location::geometry) as longitude, 
          ST_Y(e.location::geometry) as latitude,
          c.name_en as category_name_en, c.name_rw as category_name_rw, u.name as creator_name,
          p.created_at as registration_date
        FROM event_participants p
        JOIN events e ON p.event_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE p.user_id = $1
        ORDER BY e.start_date ASC`;
    } else {
      query = `
        SELECT e.*, c.name_en as category_name_en, c.name_rw as category_name_rw, u.name as creator_name,
               p.created_at as registration_date
        FROM event_participants p
        JOIN events e ON p.event_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE p.user_id = $1
        ORDER BY e.start_date ASC`;
    }

    const { rows } = await db.query(query, [userId]);
    return rows;
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = User;
