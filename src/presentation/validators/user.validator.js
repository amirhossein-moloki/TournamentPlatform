const Joi = require('joi');

const updateUserProfileSchema = Joi.object({
    body: Joi.object({
        username: Joi.string().min(3).max(30),
        // Add other fields a user can update, e.g., password change would be a separate flow
    }).min(1), // Require at least one field to update
});

const adminUpdateUserSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        username: Joi.string().min(3).max(30),
        email: Joi.string().email(),
        roles: Joi.array().items(Joi.string()),
        isVerified: Joi.boolean(),
    }).min(1),
});

const listUsersSchema = Joi.object({
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        role: Joi.string(),
        isVerified: Joi.boolean(),
        sortBy: Joi.string(), // e.g., 'createdAt:desc'
    }),
});

const assignRoleSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        role: Joi.string().required(),
    }),
});

const removeRoleSchema = Joi.object({
    params: Joi.object({
        id: Joi.string().uuid().required(),
        role: Joi.string().required(),
    }),
});

module.exports = {
  updateUserProfileSchema,
  adminUpdateUserSchema,
  listUsersSchema,
  assignRoleSchema,
  removeRoleSchema,
};
