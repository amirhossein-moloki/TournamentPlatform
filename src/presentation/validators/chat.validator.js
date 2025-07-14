const Joi = require('joi');

const getChatHistorySchema = Joi.object({
  params: Joi.object({
    sessionId: Joi.string().uuid().required(),
  }),
});

const createChatSessionSchema = Joi.object({
  body: Joi.object({
    tournamentId: Joi.string().uuid(),
  }),
});

module.exports = {
  getChatHistorySchema,
  createChatSessionSchema,
};
