const Joi = require('joi');

const tournamentSubscriptionSchema = Joi.object({
  tournamentId: Joi.string().uuid().required(),
});

module.exports = {
  tournamentSubscriptionSchema,
};
