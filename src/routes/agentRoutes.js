const express = require('express');
const { getAgents, createAgent, updateAgent, deleteAgent } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getAgents)
  .post(protect, createAgent);

router.route('/:id')
  .put(protect, updateAgent)
  .delete(protect, deleteAgent);

module.exports = router;