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
  // email: Joi.string().email().optional(),
}).min(1);

const adminUpdateUserSchema = Joi.object({
    username: Joi.string().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('User', 'Admin', 'DisputeModerator', 'FinanceManager').optional(),
    isVerified: Joi.boolean().optional(),
}).min(1);


module.exports = (
    { getUserProfileUseCase, updateUserProfileUseCase, listUsersUseCase, adminUpdateUserUseCase, adminDeleteUserUseCase }, // User use cases
    userGameProfileController, // UserGameProfile controller
    authenticateToken,
    authorizeRole
) => {
    const router = express.Router(); // Create router instance inside the factory

    // --- User Profile Routes (/me) ---
    router.get('/me', authenticateToken, async (req, res, next) => {
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
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const filters = {};
            if (req.query.role) filters.role = req.query.role;
            if (req.query.isVerified) filters.isVerified = req.query.isVerified === 'true';
            const result = await listUsersUseCase.execute({ page, limit, filters });
            return new ApiResponse(res, httpStatusCodes.OK, 'Users listed successfully.', {
                users: result.users.map(user => user.toPublicProfile()),
                totalItems: result.total,
                currentPage: result.page,
                pageSize: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            }).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', authenticateToken, authorizeRole(['Admin']), async (req, res, next) => {
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
        const gameProfileRouter = express.Router({ mergeParams: true });
        // Assuming userGameProfileController methods are designed to be route handlers
        if (userGameProfileController.upsertProfile) {
            gameProfileRouter.post('/', userGameProfileController.upsertProfile);
        }
        if (userGameProfileController.getProfiles) {
            gameProfileRouter.get('/', userGameProfileController.getProfiles);
        }
        if (userGameProfileController.getProfileForGame) {
            gameProfileRouter.get('/:gameId', userGameProfileController.getProfileForGame);
        }
        // Mount sub-router under /me/game-profiles, ensuring authenticateToken is applied
        router.use('/me/game-profiles', authenticateToken, gameProfileRouter);
    }

    return router;
};
