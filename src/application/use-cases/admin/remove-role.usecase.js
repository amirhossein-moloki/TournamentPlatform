const { BadRequestError, NotFoundError, InternalServerError } = require('../../../utils/errors');
const ApiError = require('../../../utils/ApiError');
const { User } = require('../../../domain/user/user.entity'); // For User.UserRoles
const httpStatusCodes = require('http-status-codes');

class RemoveRoleUseCase {
  /**
   * @param {import('../../../domain/user/user.repository.interface')} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Removes a role from a user.
   * @param {string} targetUserId - The ID of the user to remove the role from.
   * @param {string} roleToRemove - The role to remove.
   * @param {string} [adminUserId] - Optional ID of the admin performing the action (for auditing).
   * @returns {Promise<User>} The updated User domain entity.
   */
  async execute(targetUserId, roleToRemove, adminUserId /* for future audit logging */) {
    if (!targetUserId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Target User ID is required.');
    }
    if (!roleToRemove) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Role to remove is required.');
    }

    if (!Object.values(User.UserRoles).includes(roleToRemove)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid role specified: ${roleToRemove}.`);
    }

    const userToUpdate = await this.userRepository.findById(targetUserId);
    if (!userToUpdate) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Target user with ID ${targetUserId} not found.`);
    }

    if (!userToUpdate.hasRole(roleToRemove)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `User does not have the role: ${roleToRemove}.`);
    }

    try {
      userToUpdate.removeRole(roleToRemove); // Entity method handles validation (e.g., not removing last PLAYER role) and updates roles array + updatedAt
    } catch (domainError) {
      // Catch errors from entity method (e.g., trying to remove essential role)
      throw new ApiError(httpStatusCodes.BAD_REQUEST, domainError.message);
    }

    const updatedUser = await this.userRepository.update(targetUserId, {
      roles: userToUpdate.roles,
      updatedAt: userToUpdate.updatedAt,
    });

    if (!updatedUser) {
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, `Failed to remove role '${roleToRemove}' from user ${targetUserId}.`);
    }

    // TODO: Add audit logging here if adminUserId is provided
    // logger.info(`Role '${roleToRemove}' removed from user ${targetUserId} by admin ${adminUserId}.`);

    return updatedUser;
  }
}

module.exports = RemoveRoleUseCase;
