const Agent = require('../models/Agent');

const getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.findAll();
    res.json(agents);
  } catch (error) {
    next(error);
  }
};

const createAgent = async (req, res, next) => {
  try {
    const agent = await Agent.create(req.body);
    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
};

const updateAgent = async (req, res, next) => {
  try {
    const agent = await Agent.update(req.params.id, req.body);
    res.json(agent);
  } catch (error) {
    next(error);
  }
};

const deleteAgent = async (req, res, next) => {
  try {
    await Agent.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getAgents, createAgent, updateAgent, deleteAgent };