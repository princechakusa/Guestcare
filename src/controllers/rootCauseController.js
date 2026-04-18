const RootCause = require('../models/RootCause');

const getRootCauses = async (req, res, next) => {
  try {
    const rootCauses = await RootCause.findAll();
    res.json(rootCauses);
  } catch (error) {
    next(error);
  }
};

const createRootCause = async (req, res, next) => {
  try {
    const rootCause = await RootCause.create(req.body);
    res.status(201).json(rootCause);
  } catch (error) {
    next(error);
  }
};

const deleteRootCause = async (req, res, next) => {
  try {
    await RootCause.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getRootCauses, createRootCause, deleteRootCause };