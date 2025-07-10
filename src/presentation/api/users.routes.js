const express = require('express');
const Joi = require('joi');
// Middleware, use cases, and other dependencies are injected by the factory.
// const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
// const GetUserProfileUseCase = require('../../application/use-cases/user/get-user-profile.usecase');
// ... (other use cases)
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

// Schemas defined once, used by the factory-returned router
const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  // email: Joi.string().email().optional(), // Email updates should likely have a separate verification flow
}).min(1); // Ensure at least one field is provided for update

const adminUpdateUserSchema = Joi.object({
    username: Joi.string().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('User', 'Admin', 'DisputeModerator', 'FinanceManager').optional(),
    isVerified: Joi.boolean().optional(), // Allow admin to verify/unverify user
}).min(1); // Ensure at least one field is provided for update


// Note: JSDoc @typedef schemas previously here have been moved to swagger.js components.schemas
// for central management. Routes now use $ref to these central schemas.

module.exports = (
    { getUserProfileUseCase, updateUserProfileUseCase, listUsersUseCase, adminUpdateUserUseCase, adminDeleteUserUseCase }, // User use cases
    userGameProfileController, // UserGameProfile controller
    authenticateToken,
    authorizeRole
) => {
    const router = express.Router(); // Create router instance inside the factory

    // --- User Profile Routes (/me) ---
    router.get('/me', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Users']
            #swagger.summary = 'Get current user\'s profile'
            #swagger.description = 'Retrieves the profile of the currently authenticated user.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.responses[200] = {
                description: 'User profile retrieved successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublicProfile" } } }
            }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'User not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const userId = req.user.sub;
            if (!userId) { // Should be caught by authenticateToken, but as a safeguard
                throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'User ID not found in token.');
            }
            const user = await getUserProfileUseCase.execute(req.user.sub);
            return new ApiResponse(res, httpStatusCodes.OK, 'User profile retrieved successfully.', user.toPublicProfile()).send();
        } catch (error) {
            next(error);
        }
    });

    router.put('/me', authenticateToken, async (req, res, next) => {
        /*
            #swagger.tags = ['Users']
            #swagger.summary = 'Update current user\'s profile'
            #swagger.description = 'Allows the authenticated user to update their own profile information (e.g., username). Email/password changes should be handled via separate, more secure flows.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.requestBody = {
                required: true,
                content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUserProfileRequest" } } }
            }
            #swagger.responses[200] = {
                description: 'User profile updated successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublicProfile" } } }
            }
            #swagger.responses[400] = { description: 'Validation error or no data provided.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const userId = req.user.sub;
            const { error, value: updateData } = updateUserSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            if (Object.keys(updateData).length === 0) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'No update data provided.');
            }
            const updatedUser = await updateUserProfileUseCase.execute(userId, updateData);
            return new ApiResponse(res, httpStatusCodes.OK, 'Profile updated successfully.', updatedUser.toPublicProfile()).send();
        } catch (error) {
            next(error);
        }
    });

    // --- Admin User Management Routes ---
    router.get('/', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        /*
            #swagger.tags = ['Admin - Users']
            #swagger.summary = 'List all users (Admin only)'
            #swagger.description = 'Retrieves a paginated list of all users. Requires Admin role.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['page'] = { in: 'query', description: 'Page number for pagination.', schema: { type: 'integer', default: 1, minimum: 1 } }
            #swagger.parameters['limit'] = { in: 'query', description: 'Number of items per page.', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } }
            #swagger.parameters['role'] = { in: 'query', description: 'Filter by user role.', schema: { type: 'string', enum: ['User', 'Admin', 'DisputeModerator', 'FinanceManager'] } }
            #swagger.parameters['isVerified'] = { in: 'query', description: 'Filter by email verification status.', schema: { type: 'boolean' } }
            #swagger.responses[200] = {
                description: 'A paginated list of users.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedUsersResponse" } } }
            }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {};
            if (req.query.role) filters.role = req.query.role;
            if (req.query.isVerified) filters.isVerified = req.query.isVerified === 'true';
            const result = await listUsersUseCase.execute({ page, limit, filters });
            // Map to PaginatedUsers schema: { page, limit, totalPages, totalItems, items: [UserPublicProfile or AdminUserView] }
            const responseData = {
                page: result.page, // Assuming use case returns 'page'
                limit: result.limit, // Assuming use case returns 'limit'
                totalPages: result.totalPages, // Assuming use case returns 'totalPages'
                totalItems: result.total, // Assuming use case returns 'total'
                items: result.users.map(user => user.toPublicProfile()), // Assuming UserPublicProfile is the target schema for items
            };
            return new ApiResponse(res, httpStatusCodes.OK, 'Users listed successfully.', responseData).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        /*
            #swagger.tags = ['Admin - Users']
            #swagger.summary = 'Get a specific user by ID (Admin only)'
            #swagger.description = 'Retrieves the profile of a specific user by their ID. Requires Admin role.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = { in: 'path', description: 'User ID (UUID)', required: true, schema: { type: 'string', format: 'uuid' } }
            #swagger.responses[200] = {
                description: 'User profile retrieved successfully.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublicProfile" } } }
            }
            #swagger.responses[400] = { description: 'Invalid User ID format.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'User not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id } = req.params;
            const { error: idError } = Joi.string().uuid().required().validate(id);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid User ID format.', idError.details.map(d => d.message));
            }
            const user = await getUserProfileUseCase.execute(id);
            return new ApiResponse(res, httpStatusCodes.OK, 'User profile retrieved successfully.', user.toPublicProfile()).send();
        } catch (error) {
            next(error);
        }
    });

    router.put('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        /*
            #swagger.tags = ['Admin - Users']
            #swagger.summary = 'Update a user by ID (Admin only)'
            #swagger.description = 'Allows an Admin to update a user\'s profile information (username, email, role, verification status). Requires Admin role.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = { in: 'path', description: 'User ID (UUID)', required: true, schema: { type: 'string', format: 'uuid' } }
            #swagger.requestBody = {
                required: true,
                content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUpdateUserRequest" } } }
            }
            #swagger.responses[200] = {
                description: 'User updated successfully by admin.',
                content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublicProfile" } } }
            }
            #swagger.responses[400] = { description: 'Validation error, Invalid User ID, or no data provided.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (User is not an Admin).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'User not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id } = req.params;
            const { error: idValError } = Joi.string().uuid().required().validate(id);
            if (idValError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid User ID format.', idValError.details.map(d => d.message));
            }
            const { error, value: adminUpdateData } = adminUpdateUserSchema.validate(req.body);
            if (error) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
            }
            if (Object.keys(adminUpdateData).length === 0) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'No update data provided.');
            }
            const updatedUser = await adminUpdateUserUseCase.execute(id, adminUpdateData, req.user.sub);
            return new ApiResponse(res, httpStatusCodes.OK, 'User updated successfully by admin.', updatedUser.toPublicProfile()).send();
        } catch (error) {
            next(error);
        }
    });

    router.delete('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
        /*
            #swagger.tags = ['Admin - Users']
            #swagger.summary = 'Delete a user by ID (Admin only)'
            #swagger.description = 'Allows an Admin to delete a user. Admin cannot delete their own account via this endpoint. Requires Admin role.'
            #swagger.security = [{ "bearerAuth": [] }]
            #swagger.parameters['id'] = { in: 'path', description: 'User ID (UUID)', required: true, schema: { type: 'string', format: 'uuid' } }
            #swagger.responses[200] = {
                description: 'User deleted successfully.',
                content: { "application/json": { schema: { type: 'object', properties: { message: { type: 'string', example: 'User deleted successfully.'} } } } }
            }
            #swagger.responses[400] = { description: 'Invalid User ID format.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[403] = { description: 'Forbidden (User is not an Admin or Admin trying to delete self).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[404] = { description: 'User not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
            #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
        */
        try {
            const { id } = req.params;
            const { error: idError } = Joi.string().uuid().required().validate(id);
            if (idError) {
                throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid User ID format.', idError.details.map(d => d.message));
            }
            if (req.user.sub === id) {
                throw new ApiError(httpStatusCodes.FORBIDDEN, "Admin cannot delete their own account through this endpoint.");
            }
            const result = await adminDeleteUserUseCase.execute(id, req.user.sub);
            return new ApiResponse(res, httpStatusCodes.OK, result.message).send();
        } catch (error) {
            next(error);
        }
    });

    // --- User Game Profiles Routes (/me/game-profiles) ---
    // UserGameProfileController methods are expected to be Express middleware (req, res, next)
    if (userGameProfileController) { // Check if controller is injected
        const gameProfileRouter = express.Router({ mergeParams: true }); // Use mergeParams to access parent router params if needed

        if (userGameProfileController.upsertProfile) {
            gameProfileRouter.post('/', (req, res, next) => {
                /*
                    #swagger.tags = ['User Game Profiles']
                    #swagger.summary = 'Create or update a game profile for the current user.'
                    #swagger.description = 'If a profile for the given gameId already exists for the user, it will be updated. Otherwise, a new one is created. User must be authenticated.'
                    #swagger.security = [{ "bearerAuth": [] }]
                    #swagger.requestBody = {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/UserGameProfileRequest" } } }
                    }
                    #swagger.responses[200] = { description: 'Game profile updated successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/UserGameProfileResponse" } } } }
                    #swagger.responses[201] = { description: 'Game profile created successfully.', content: { "application/json": { schema: { $ref: "#/components/schemas/UserGameProfileResponse" } } } }
                    #swagger.responses[400] = { description: 'Validation error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[404] = { description: 'Game ID not found (if validation performed).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                */
                userGameProfileController.upsertProfile(req, res, next);
            });
        }

        if (userGameProfileController.getProfiles) {
            gameProfileRouter.get('/', (req, res, next) => {
                /*
                    #swagger.tags = ['User Game Profiles']
                    #swagger.summary = 'Get all game profiles for the current user.'
                    #swagger.description = 'Retrieves a list of all game-specific profiles for the authenticated user.'
                    #swagger.security = [{ "bearerAuth": [] }]
                    #swagger.responses[200] = {
                        description: 'A list of the user\'s game profiles.',
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ListOfUserGameProfiles" } } }
                    }
                    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                */
                userGameProfileController.getProfiles(req, res, next);
            });
        }

        if (userGameProfileController.getProfileForGame) {
            gameProfileRouter.get('/:gameId', (req, res, next) => {
                /*
                    #swagger.tags = ['User Game Profiles']
                    #swagger.summary = 'Get a specific game profile for the current user by game ID.'
                    #swagger.description = 'Retrieves a specific game profile for the authenticated user, identified by the game ID.'
                    #swagger.security = [{ "bearerAuth": [] }]
                    #swagger.parameters['gameId'] = {
                        in: 'path',
                        description: 'ID of the game for which to retrieve the profile (UUID).',
                        required: true,
                        schema: { type: 'string', format: 'uuid' }
                    }
                    #swagger.responses[200] = {
                        description: 'The user\'s game profile for the specified game.',
                        content: { "application/json": { schema: { $ref: "#/components/schemas/UserGameProfileResponse" } } }
                    }
                    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[404] = { description: 'Game profile not found for this user and game, or Game ID is invalid.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
                */
                userGameProfileController.getProfileForGame(req, res, next);
            });
        }
        // Mount sub-router under /me/game-profiles, ensuring authenticateToken is applied
        router.use('/me/game-profiles', authenticateToken, gameProfileRouter);
    }

    return router;
};
