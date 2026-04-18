const express = require('express');
const { getMessages, createMessage, upsertMessage, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getMessages)
  .post(protect, createMessage);

router.route('/upsert')
  .post(protect, upsertMessage);

router.route('/:id')
  .delete(protect, deleteMessage);

module.exports = router;