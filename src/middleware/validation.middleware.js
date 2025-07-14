const Joi = require('joi');
const { BadRequestError } = require('../utils/errors');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate({
    body: req.body,
    query: req.query,
    params: req.params,
  }, {
    abortEarly: false, // Return all errors
    allowUnknown: true, // Allow unknown keys
    stripUnknown: true, // Remove unknown keys
  });

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new BadRequestError(errorMessage));
  }

  return next();
};

module.exports = validate;
