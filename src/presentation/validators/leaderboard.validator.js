const Joi = require('joi');

const getLeaderboardSchema = Joi.object({
  query: Joi.object({
    gameName: Joi.string().required(),
    metric: Joi.string().valid('wins', 'score', 'rating', 'earnings').default('rating'),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'all_time').default('all_time'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
});

const getUserRankSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    gameName: Joi.string().required(),
    metric: Joi.string().valid('wins', 'score', 'rating', 'earnings').default('rating'),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'all_time').default('all_time'),
    surroundingCount: Joi.number().integer().min(0).max(10).default(5),
  }),
});

module.exports = {
  getLeaderboardSchema,
  getUserRankSchema,
};
