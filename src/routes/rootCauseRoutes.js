const express = require('express');
const { getRootCauses, createRootCause, deleteRootCause } = require('../controllers/rootCauseController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getRootCauses)
  .post(protect, createRootCause);

router.route('/:id')
  .delete(protect, deleteRootCause);

module.exports = router;