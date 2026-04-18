const express = require('express');
const { getProperties, createProperty, updateProperty, deleteProperty } = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getProperties)
  .post(protect, createProperty);

router.route('/:id')
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

module.exports = router;