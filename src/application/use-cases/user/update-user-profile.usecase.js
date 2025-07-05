const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { User } = require('../../../domain/user/user.entity'); // For type hinting if using TypeScript/JSDoc

class UpdateUserProfileUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Updates the profile of a given user.
   * Only allows updating non-sensitive fields like username.
   * Email and password changes should have dedicated use cases and flows.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - Data to update.
   * @param {string} [updateData.username] - New username.
   * // Add other updatable profile fields here, e.g., bio, avatarUrl
   * @returns {Promise<import('../../../domain/user/user.entity').User>} The updated User domain entity.
   * @throws {ApiError} If validation fails, user not found, or update fails.
   */
  async execute(userId, updateData) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'No update data provided.');
    }

    // Fetch the user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
    }

    const fieldsToUpdate = {};

    // Handle username update (if provided and different)
    if (updateData.username && updateData.username !== user.username) {
      // Validate username format/length (can also be done by Joi in route)
      if (updateData.username.length < 3 || updateData.username.length > 30) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Username must be between 3 and 30 characters.');
      }
      // Check for username uniqueness
      const existingUserByUsername = await this.userRepository.findByUsername(updateData.username);
      if (existingUserByUsername && existingUserByUsername.id !== userId) {
        throw new ApiError(httpStatusCodes.CONFLICT, 'Username already taken.');
      }
      // Update directly on domain entity if it has setters, or prepare for repo update
      user.username = updateData.username; // Assuming direct property update is fine for simple fields
      fieldsToUpdate.username = user.username;
    }

    // Add logic for other updatable fields similarly:
    // if (updateData.bio) {
    //   user.bio = updateData.bio;
    //   fieldsToUpdate.bio = user.bio;
    // }

    if (Object.keys(fieldsToUpdate).length === 0) {
      // No actual changes to persist, return current user
      return user;
    }

    // The User domain entity should update its own `updatedAt` timestamp if property setters are used.
    // If not, ensure `updatedAt` is handled. Sequelize usually handles this automatically on update.
    // For consistency, if domain entity updates `updatedAt`, pass it.
    // user.updatedAt = new Date(); // If domain entity manages this.
    // fieldsToUpdate.updatedAt = user.updatedAt;

    // Persist changes
    const updatedUser = await this.userRepository.update(userId, fieldsToUpdate);
    if (!updatedUser) {
      // This might happen if the update operation in repository returns null on failure
      // or if user was deleted concurrently (though findById should have caught this).
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update user profile.');
    }

    return updatedUser;
  }
}

module.exports = UpdateUserProfileUseCase;

// Notes:
// - This use case focuses on updating basic profile information like username.
// - It explicitly excludes email and password changes, which require more complex flows
//   (e.g., email re-verification, current password confirmation).
// - Includes validation for username (length, uniqueness).
// - Fetches the user, applies changes to the domain entity (or prepares data for repo), and saves.
// - The `userRepository.update` method is used. It's crucial that this method
//   only updates the fields provided in `fieldsToUpdate` and doesn't overwrite others.
//   The current `PostgresUserRepository.update` passes `updateData` directly to Sequelize's update,
//   which is correct behavior (updates only specified fields).
// - Returns the updated User domain entity. The presentation layer will handle DTO mapping.
// - If domain entities have setters that update `this.updatedAt`, ensure this is passed or rely on Sequelize.
//   The `User.entity.js` methods like `updatePassword` do set `this.updatedAt`. Simple property
//   assignments (like `user.username = ...`) do not, unless there's a setter.
//   It's often better to have explicit methods on the entity for all changes, e.g., `user.changeUsername(newUsername)`.
//   For now, direct property update is shown for simplicity for `username`.
//   If the `User` entity had `changeUsername(newUsername)` which also updated `this.updatedAt`,
//   then `fieldsToUpdate.updatedAt = user.updatedAt` would be more relevant.
//   Since Sequelize handles `updatedAt` automatically on `update` calls, explicitly passing it
//   from here is usually not necessary unless the domain entity's timestamp is specifically required.
//   The current `PostgresUserRepository.update` re-fetches the user, so it will have the DB-updated timestamp.
