const Review = require('../models/Review');

const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findAll();
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const review = await Review.update(req.params.id, req.body);
    res.json(review);
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    await Review.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { getReviews, createReview, updateReview, deleteReview };