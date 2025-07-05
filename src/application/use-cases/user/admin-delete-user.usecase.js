const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class AdminDeleteUserUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Allows an Admin to delete a user's account.
   * @param {string} targetUserId - The ID of the user to be deleted.
   * @param {string} adminUserId - The ID of the admin performing the deletion (for auditing and checks).
   * @returns {Promise<{message: string, deletedUserId: string}>}
   * @throws {ApiError} If user not found, admin tries to delete self, or deletion fails.
   */
  async execute(targetUserId, adminUserId) {
    if (!targetUserId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Target User ID is required for deletion.');
    }
    if (!adminUserId) {
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Admin User ID performing deletion is required.');
    }

    // Prevent admin from deleting themselves through this specific endpoint
    if (targetUserId === adminUserId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, "Administrators cannot delete their own account using this function. Use a dedicated account management process if needed.");
    }

    // Check if the target user exists
    const userToDelete = await this.userRepository.findById(targetUserId);
    if (!userToDelete) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User to be deleted not found.');
    }

    // Business logic before deletion:
    // - Can this user be deleted? (e.g., are they an organizer of active tournaments?)
    // - What happens to their data? (e.g., anonymize, soft delete, hard delete)
    // - Are there related records that need cleanup or re-assignment?
    // For this use case, we'll proceed with a hard delete via repository.
    // More complex scenarios would involve more domain logic or calls to other services/repositories.

    // Audit logging for this critical action should be implemented
    // logger.info(`Admin ${adminUserId} initiated deletion for user ${targetUserId}.`);

    const success = await this.userRepository.delete(targetUserId);

    if (!success) {
      // This might happen if the user was deleted by another process between findById and delete,
      // or if there's a DB constraint preventing deletion not caught by business logic.
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete user. The user might have already been deleted or a database error occurred.');
    }

    // Post-deletion actions:
    // - Invalidate any active sessions/tokens for the deleted user (if not handled by token checks).
    // - Notify other services if needed (e.g., via event).

    return {
      message: 'User account deleted successfully by admin.',
      deletedUserId: targetUserId,
    };
  }
}

module.exports = AdminDeleteUserUseCase;

// Notes:
// - Handles admin-initiated user deletion.
// - Includes a check to prevent an admin from deleting their own account via this specific flow.
// - Relies on `userRepository.findById()` to confirm user existence and `userRepository.delete()` for actual deletion.
// - Highlights the need for more complex business logic for data handling (anonymization, soft delete, cascading effects)
//   in a real-world application, which are out of scope for this basic implementation.
// - Emphasizes the importance of audit logging for such critical admin actions.
// - The `userRepository.delete()` method should return a boolean indicating success.
//   The `PostgresUserRepository.delete()` method currently does this.
