const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../../../utils/errors');
const { User } = require('../../../domain/user/user.entity'); // For User.UserRoles

class AssignRoleUseCase {
  /**
   * @param {import('../../../domain/user/user.repository.interface')} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Assigns a role to a user.
   * @param {string} targetUserId - The ID of the user to assign the role to.
   * @param {string} roleToAssign - The role to assign.
   * @param {string} [adminUserId] - Optional ID of the admin performing the action (for auditing).
   * @returns {Promise<User>} The updated User domain entity.
   */
  async execute(targetUserId, roleToAssign, adminUserId /* for future audit logging */) {
    if (!targetUserId) {
      throw new BadRequestError('Target User ID is required.');
    }
    if (!roleToAssign) {
      throw new BadRequestError('Role to assign is required.');
    }

    if (!Object.values(User.UserRoles).includes(roleToAssign)) {
      throw new BadRequestError(`Invalid role specified: ${roleToAssign}.`);
    }

    const userToUpdate = await this.userRepository.findById(targetUserId);
    if (!userToUpdate) {
      throw new NotFoundError(`Target user with ID ${targetUserId} not found.`);
    }

    if (userToUpdate.hasRole(roleToAssign)) {
      throw new ConflictError(`User already has the role: ${roleToAssign}.`);
    }

    try {
      userToUpdate.addRole(roleToAssign); // Entity method handles validation and updates roles array + updatedAt
    } catch (domainError) {
      // Catch errors from entity method (e.g., invalid role, though checked above, or other internal logic)
      throw new BadRequestError(domainError.message);
    }

    const updatedUser = await this.userRepository.update(targetUserId, {
      roles: userToUpdate.roles,
      updatedAt: userToUpdate.updatedAt,
    });

    if (!updatedUser) {
      throw new InternalServerError(`Failed to assign role '${roleToAssign}' to user ${targetUserId}.`);
    }

    // TODO: Add audit logging here if adminUserId is provided
    // logger.info(`Role '${roleToAssign}' assigned to user ${targetUserId} by admin ${adminUserId}.`);

    return updatedUser;
  }
}

module.exports = AssignRoleUseCase;
