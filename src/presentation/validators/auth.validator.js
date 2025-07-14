const Joi = require('joi');

const registerSchema = Joi.object({
  body: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
    email: Joi.string().email().required(),
  }),
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
});

const verifyEmailSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
};
