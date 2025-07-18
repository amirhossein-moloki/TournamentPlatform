const Joi = require('joi');

const gameIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const gamePayloadSchema = Joi.object({
    body: Joi.object({
        name: Joi.string().min(1).max(100).required(),
        shortName: Joi.string().min(1).max(20).optional().allow(null, ''),
        description: Joi.string().max(1000).optional().allow(null, ''),
        platforms: Joi.array().items(Joi.string()).optional(),
        supportedModes: Joi.array().items(Joi.string()).optional(),
        isActive: Joi.boolean().default(true),
        winCondition: Joi.string().valid('higher_score_wins', 'lower_score_wins').optional().allow(null),
        tournament_managers: Joi.array().items(Joi.string().uuid()).optional().allow(null),
        tournament_supports: Joi.array().items(Joi.string().uuid()).optional().allow(null),
        images: Joi.array().items(Joi.object({
            type: Joi.string().required(),
            url: Joi.string().uri().required(),
        })).optional(),
    }),
});

const listGamesSchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        isActive: Joi.boolean(),
        sortBy: Joi.string(), // e.g., 'name:asc'
    }),
});

module.exports = {
  gameIdParamSchema,
  gamePayloadSchema,
  listGamesSchema,
};
