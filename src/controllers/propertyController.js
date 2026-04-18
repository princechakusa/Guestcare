const Property = require('../models/Property');

const getProperties = async (req, res, next) => {
  try {
    const properties = await Property.findAll();
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.update(req.params.id, req.body);
    res.json(property);
  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    await Property.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getProperties, createProperty, updateProperty, deleteProperty };