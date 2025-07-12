const router = require('express').Router();
const { Joi, validate } = require('express-validation');
const userController = require('../controllers/user.controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');

// --- Joi Schemas for Validation ---
const updateUserProfileSchema = {
    body: Joi.object({
        username: Joi.string().min(3).max(30),
        // Add other fields a user can update, e.g., password change would be a separate flow
    }).min(1), // Require at least one field to update
};

const adminUpdateUserSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        username: Joi.string().min(3).max(30),
        email: Joi.string().email(),
        roles: Joi.array().items(Joi.string()),
        isVerified: Joi.boolean(),
    }).min(1),
};

const listUsersSchema = {
    query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100),
        role: Joi.string(),
        isVerified: Joi.boolean(),
        sortBy: Joi.string(), // e.g., 'createdAt:desc'
    }),
};

const assignRoleSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
    body: Joi.object({
        role: Joi.string().required(),
    }),
};

const removeRoleSchema = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
        role: Joi.string().required(),
    }),
};

// --- Routes ---

// Get current user's profile
router.get('/me', authenticateToken, userController.getCurrentUserProfile);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Get current user's profile"
    #swagger.description = "Retrieves the profile of the currently authenticated user."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'User profile retrieved successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
*/

// Update current user's profile
router.put('/me', authenticateToken, validate(updateUserProfileSchema), userController.updateCurrentUserProfile);
/*  #swagger.tags = ['Users']
    #swagger.summary = "Update current user's profile"
    #swagger.description = "Allows the authenticated user to update their own profile information."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUserProfileRequest" } } } }
    #swagger.responses[200] = { description: 'User profile updated successfully.', schema: { $ref: '#/components/schemas/UserPublicProfile' } }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
*/


module.exports = router;
