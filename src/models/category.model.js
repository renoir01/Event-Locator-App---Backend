const db = require('../config/database');

class Category {
  /**
   * Get all categories
   * @returns {Promise<Array>} Array of category objects
   */
  static async getAll() {
    const query = `
      SELECT id, name_en, name_rw, created_at
      FROM categories
      ORDER BY id ASC
    `;
    
    const { rows } = await db.query(query);
    return rows;
  }

  /**
   * Get a category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  static async getById(id) {
    const query = `
      SELECT id, name_en, name_rw, created_at
      FROM categories
      WHERE id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = Category;
