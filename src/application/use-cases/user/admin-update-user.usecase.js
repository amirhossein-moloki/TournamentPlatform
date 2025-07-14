const { BadRequestError, InternalServerError, NotFoundError, ConflictError } = require('../../../utils/errors');
const { User } = require('../../../domain/user/user.entity'); // For type hinting and role validation

class AdminUpdateUserUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Allows an Admin to update specific fields of a user's profile.
   * @param {string} targetUserId - The ID of the user to be updated by the admin.
   * @param {object} adminUpdateData - Data to update.
   * @param {string} [adminUpdateData.username] - New username.
   * @param {string} [adminUpdateData.email] - New email.
   * @param {string} [adminUpdateData.role] - New role for the user.
   * @param {boolean} [adminUpdateData.isVerified] - New verification status.
   * // Other admin-updatable fields can be added here.
   * @param {string} adminUserId - The ID of the admin performing the update (for auditing).
   * @returns {Promise<import('../../../domain/user/user.entity').User>} The updated User domain entity.
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').InternalServerError}
   * @throws {import('../../../utils/errors').NotFoundError}
   * @throws {import('../../../utils/errors').ConflictError}
   */
  async execute(targetUserId, adminUpdateData, adminUserId) {
    if (!targetUserId) {
      throw new BadRequestError('Target User ID is required.');
    }
    if (!adminUpdateData || Object.keys(adminUpdateData).length === 0) {
      throw new BadRequestError('No update data provided.');
    }
    if (!adminUserId) {
        // This should ideally be verified by middleware that admin is performing action
        throw new InternalServerError('Admin user ID not provided for action.');
    }

    // Fetch the user to be updated
    const userToUpdate = await this.userRepository.findById(targetUserId);
    if (!userToUpdate) {
      throw new NotFoundError('Target user not found.');
    }

    // Prevent admin from unintentionally modifying their own critical data through this generic endpoint
    // if (targetUserId === adminUserId && (adminUpdateData.role || adminUpdateData.isVerified === false)) {
    //   throw new ForbiddenError("Admins cannot change their own role or unverify themselves through this endpoint. Use specific admin management tools if needed.");
    // }


    const fieldsToPersist = {};

    // Username update logic (check uniqueness)
    if (adminUpdateData.username && adminUpdateData.username !== userToUpdate.username) {
      if (adminUpdateData.username.length < 3 || adminUpdateData.username.length > 30) {
        throw new BadRequestError('Username must be between 3 and 30 characters.');
      }
      const existingByUsername = await this.userRepository.findByUsername(adminUpdateData.username);
      if (existingByUsername && existingByUsername.id !== targetUserId) {
        throw new ConflictError('Username already taken.');
      }
      userToUpdate.username = adminUpdateData.username; // Assuming direct update or entity method
      fieldsToPersist.username = userToUpdate.username;
    }

    // Email update logic (check uniqueness, consider re-verification flow)
    if (adminUpdateData.email && adminUpdateData.email !== userToUpdate.email) {
      // Basic email format validation can be here or rely on Joi at route
      const existingByEmail = await this.userRepository.findByEmail(adminUpdateData.email);
      if (existingByEmail && existingByEmail.id !== targetUserId) {
        throw new ConflictError('Email already taken.');
      }
      userToUpdate.email = adminUpdateData.email;
      fieldsToPersist.email = userToUpdate.email;
      // Admin changing email might also set user.isVerified to false and trigger re-verification.
      // userToUpdate.isVerified = false;
      // fieldsToPersist.isVerified = userToUpdate.isVerified;
      // This depends on application policy. For now, just updating email.
    }

    // Role update logic
    if (adminUpdateData.role && adminUpdateData.role !== userToUpdate.role) {
      // User domain entity should have role validation logic
      try {
        userToUpdate.updateRole(adminUpdateData.role); // This method exists on User entity
        fieldsToPersist.role = userToUpdate.role;
      } catch (domainError) {
        throw new BadRequestError(domainError.message);
      }
    }

    // Verification status update
    if (adminUpdateData.isVerified !== undefined && adminUpdateData.isVerified !== userToUpdate.isVerified) {
      userToUpdate.isVerified = adminUpdateData.isVerified;
      fieldsToPersist.isVerified = userToUpdate.isVerified;
      if(userToUpdate.isVerified && userToUpdate.verificationToken){
        // If admin verifies, clear any pending verification token.
        userToUpdate.verificationToken = null;
        fieldsToPersist.verificationToken = null;
      }
    }

    // Add other updatable fields here...

    if (Object.keys(fieldsToPersist).length === 0) {
      return userToUpdate; // No actual changes to persist
    }

    // Audit logging for admin actions should happen here or in a decorator/wrapper
    // logger.info(`Admin ${adminUserId} updating user ${targetUserId} with data: ${JSON.stringify(fieldsToPersist)}`);

    // Persist changes
    const updatedUser = await this.userRepository.update(targetUserId, fieldsToPersist);
    if (!updatedUser) {
      throw new InternalServerError('Failed to update user by admin.');
    }

    return updatedUser;
  }
}

module.exports = AdminUpdateUserUseCase;

// Notes:
// - This use case is for admin users to modify other users' profiles.
// - It allows updating fields like username, email, role, isVerified.
// - Includes validation for username/email uniqueness.
// - Leverages domain entity methods (e.g., `userToUpdate.updateRole()`) for changes where possible.
// - Password changes are explicitly NOT handled here; they should have a secure reset flow.
// - Audit logging of admin actions is mentioned as an important consideration.
// - The use case requires `adminUserId` for audit purposes, though the authorization
//   (ensuring the performer *is* an admin) is handled by middleware in the presentation layer.
// - The `userRepository.update` method is used.
// - The `User.entity.js` `updateRole` method validates against allowed roles.
// - If an admin changes a user's email, a policy decision is needed on whether this
//   should automatically set `isVerified` to `false` and trigger a new verification flow.
//   This implementation currently just updates the email field if provided.
// - Clearing `verificationToken` if `isVerified` is set to true by an admin is a good practice.
//   This logic has been added.
