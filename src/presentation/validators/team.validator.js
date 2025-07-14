const Joi = require('joi');

const teamIdParamSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
});

const createTeamSchema = Joi.object({
    body: Joi.object({
        name: Joi.string().min(3).max(50).required(),
        tag: Joi.string().min(2).max(10).alphanum().optional(),
        description: Joi.string().max(255).optional().allow('', null),
    }),
});

const updateTeamSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    tag: Joi.string().min(2).max(10).alphanum().optional(),
    description: Joi.string().max(255).optional().allow('', null),
  }),
});


const listTeamsSchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
    }),
});

module.exports = {
  teamIdParamSchema,
  createTeamSchema,
  updateTeamSchema,
  listTeamsSchema,
};
