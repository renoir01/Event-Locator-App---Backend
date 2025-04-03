const express = require('express');
const CategoryController = require('../controllers/category.controller');
const router = express.Router();

/**
 * @route GET /api/categories
 * @desc Get all categories
 * @access Public
 */
router.get('/', CategoryController.getAll);

/**
 * @route GET /api/categories/:id
 * @desc Get a category by ID
 * @access Public
 */
router.get('/:id', CategoryController.getById);

module.exports = router;
