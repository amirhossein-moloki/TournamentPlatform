const Joi = require('joi');
const logger = require('./logger');

const validateSocketPayload = (schema, payload, callback) => {
  const { error } = schema.validate(payload);
  if (error) {
    logger.warn(`Invalid socket payload: ${error.message}`);
    if (typeof callback === 'function') {
      callback({ success: false, error: error.message });
    }
    return false;
  }
  return true;
};

module.exports = {
  validateSocketPayload,
};
