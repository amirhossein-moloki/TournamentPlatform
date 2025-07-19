const Joi = require('joi');
const TeamRole = require('../../domain/team/teamRole.enums');

const addMemberSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        userId: Joi.string().uuid().required(),
        role: Joi.string().valid(...Object.values(TeamRole)).default(TeamRole.MEMBER),
    }),
});

const removeMemberSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
        userId: Joi.string().uuid().required(),
    }),
});

const updateMemberRoleSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
        userId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        role: Joi.string().valid(...Object.values(TeamRole)).required(),
    }),
});

const updateMemberStatusSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
        userId: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        status: Joi.string().required(),
    }),
});

module.exports = {
  addMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateMemberStatusSchema,
};
