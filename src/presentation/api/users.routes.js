const express = require('express');
const Joi = require('joi');
const { authenticateToken, authorizeRole } = require('../../middleware/auth.middleware');
const PostgresUserRepository = require('../../infrastructure/database/repositories/postgres.user.repository');
// const GetUserProfileUseCase = require('../../application/use-cases/user/get-user-profile.usecase');
// const UpdateUserProfileUseCase = require('../../application/use-cases/user/update-user-profile.usecase');
// const ListUsersUseCase = require('../../application/use-cases/user/list-users.usecase'); // For admin
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');

const router = express.Router();
const userRepository = new PostgresUserRepository();

// --- Schemas for Validation (if needed for update, etc.) ---
const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  // email: Joi.string().email().optional(), // Email changes often require re-verification, handle with care
  // Other updatable fields...
  // password: Joi.string().min(8).optional(), // Password changes should be a separate endpoint
}).min(1); // At least one field must be provided for update

// --- Route Handlers ---

/**
 * GET /api/v1/users/me
 * Get the profile of the currently authenticated user.
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.sub; // From JWT payload (subject, i.e., user ID)
    if (!userId) {
      // This should ideally be caught by authenticateToken if token is malformed
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'User ID not found in token.');
    }

    // const getUserProfile = new GetUserProfileUseCase(userRepository);
    // const userProfile = await getUserProfile.execute(userId);
    // For now, directly use repository until specific use cases are added for /me
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User profile not found.');
    }

    // Use the domain entity's toPublicProfile method
    return new ApiResponse(res, httpStatusCodes.OK, 'User profile retrieved successfully.', user.toPublicProfile()).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/me
 * Update the profile of the currently authenticated user.
 */
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

    // const updateUserProfile = new UpdateUserProfileUseCase(userRepository);
    // const updatedUser = await updateUserProfile.execute(userId, updateData);
    // For now, direct repository usage:
    // Additional checks needed: e.g., if username is being updated, check for uniqueness.
    // This logic ideally resides in a use case.

    if (updateData.username) {
        const existingUser = await userRepository.findByUsername(updateData.username);
        if (existingUser && existingUser.id !== userId) {
            throw new ApiError(httpStatusCodes.CONFLICT, 'Username already taken.');
        }
    }
    // Email updates are more complex (verification), typically not done via simple PUT.
    // Password updates should be a separate, dedicated endpoint with current password verification.

    const user = await userRepository.update(userId, updateData);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found or update failed.');
    }

    return new ApiResponse(res, httpStatusCodes.OK, 'Profile updated successfully.', user.toPublicProfile()).send();
  } catch (error) {
    next(error);
  }
});


// --- Admin Routes for User Management (Example) ---
// These routes would require 'Admin' role.

/**
 * GET /api/v1/users
 * List all users (Admin only).
 */
router.get(
  '/',
  authenticateToken,
  authorizeRole(['Admin']), // Only Admins can list all users
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {};
      if (req.query.role) filters.role = req.query.role;
      if (req.query.isVerified) filters.isVerified = req.query.isVerified === 'true';

      // const listUsers = new ListUsersUseCase(userRepository);
      // const result = await listUsers.execute({ page, limit, filters });
      // Direct repository usage:
      const result = await userRepository.findAll({ page, limit, filters });

      return new ApiResponse(res, httpStatusCodes.OK, 'Users listed successfully.', {
        users: result.users.map(user => user.toPublicProfile()), // Ensure public profiles
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      }).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/:id
 * Get a specific user's profile by ID (Admin only).
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRole(['Admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      // const getUserProfile = new GetUserProfileUseCase(userRepository);
      // const user = await getUserProfile.execute(id);
      const user = await userRepository.findById(id);

      if (!user) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
      }
      return new ApiResponse(res, httpStatusCodes.OK, 'User profile retrieved successfully.', user.toPublicProfile()).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/users/:id
 * Update a specific user's profile by ID (Admin only).
 * Example: Admin changing user's role or verification status.
 */
const adminUpdateUserSchema = Joi.object({
    username: Joi.string().min(3).max(30).optional(),
    email: Joi.string().email().optional(), // Admin changing email might be allowed with different flow
    role: Joi.string().valid('User', 'Admin', 'DisputeModerator', 'FinanceManager').optional(),
    isVerified: Joi.boolean().optional(),
    // Admin should not change password directly here; use a password reset flow.
}).min(1);

router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['Admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { error, value: adminUpdateData } = adminUpdateUserSchema.validate(req.body);

      if (error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
      }
      if (Object.keys(adminUpdateData).length === 0) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'No update data provided.');
      }

      // Use case would be better here for complex logic like role change implications
      // const adminUpdateUser = new AdminUpdateUserUseCase(userRepository);
      // const updatedUser = await adminUpdateUser.execute(id, adminUpdateData);
      // Direct repository usage:
      if (adminUpdateData.username) {
        const existingUser = await userRepository.findByUsername(adminUpdateData.username);
        if (existingUser && existingUser.id !== id) {
            throw new ApiError(httpStatusCodes.CONFLICT, 'Username already taken.');
        }
      }
      if (adminUpdateData.email) {
        const existingUser = await userRepository.findByEmail(adminUpdateData.email);
        if (existingUser && existingUser.id !== id) {
            throw new ApiError(httpStatusCodes.CONFLICT, 'Email already taken.');
        }
      }

      const user = await userRepository.update(id, adminUpdateData);
      if (!user) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found or update failed.');
      }
      return new ApiResponse(res, httpStatusCodes.OK, 'User updated successfully by admin.', user.toPublicProfile()).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * Delete a user by ID (Admin only).
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['Admin']),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves? Or handle with care.
      if (req.user.sub === id) {
          throw new ApiError(httpStatusCodes.FORBIDDEN, "Admin cannot delete their own account through this endpoint.");
      }

      // Use case would handle cascading deletes or other business logic.
      // const deleteUser = new DeleteUserUseCase(userRepository);
      // await deleteUser.execute(id);
      const success = await userRepository.delete(id);
      if (!success) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found or delete failed.');
      }
      return new ApiResponse(res, httpStatusCodes.OK, 'User deleted successfully.').send(); // Or 204 No Content
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;

// Notes:
// - Placeholder comments for specific User use cases (GetUserProfile, UpdateUserProfile, etc.) are included.
//   For now, direct repository access is used for simplicity until those use cases are defined.
// - The `/me` routes allow authenticated users to manage their own profiles.
// - Admin routes (`/`, `/:id` GET, PUT, DELETE) are protected by `authorizeRole(['Admin'])`.
// - Input validation using Joi is included for PUT requests.
// - `toPublicProfile()` method from the User entity is used to ensure sensitive data isn't exposed.
// - Error handling passes errors to a central middleware.
// - The blueprint did not explicitly list these admin user management endpoints in the "API Endpoints" table,
//   but `users.routes.js` implies their existence. I've added a common set.
// - Password changes are complex and should have their own dedicated endpoint and use case
//   (e.g., `/users/me/change-password`) involving current password verification.
// - Email changes also often involve a re-verification process. These are not included in the simple PUT.
