const Message = require('../models/Message');

const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.findAll();
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const message = await Message.create(req.body);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

const upsertMessage = async (req, res, next) => {
  try {
    const message = await Message.upsert(req.body);
    res.json(message);
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    await Message.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages, createMessage, upsertMessage, deleteMessage };