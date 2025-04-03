const Category = require('../models/category.model');
const logger = require('../config/logger');

class CategoryController {
  /**
   * Get all categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAll(req, res, next) {
    try {
      const categories = await Category.getAll();
      
      res.json({
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching categories:', error);
      next(error);
    }
  }

  /**
   * Get a category by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getById(req, res, next) {
    try {
      const category = await Category.getById(req.params.id);
      
      if (!category) {
        return res.status(404).json({
          error: {
            message: req.t ? req.t('categories.not_found') : 'Category not found'
          }
        });
      }
      
      res.json({
        data: category
      });
    } catch (error) {
      logger.error('Error fetching category:', error);
      next(error);
    }
  }
}

module.exports = CategoryController;
