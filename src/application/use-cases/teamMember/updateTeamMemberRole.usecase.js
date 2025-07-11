const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums');

class UpdateTeamMemberRoleUseCase {
  constructor({ teamMemberRepository, teamRepository, logger }) {
    this.teamMemberRepository = teamMemberRepository;
    this.teamRepository = teamRepository;
    this.logger = logger;
  }

  async execute(teamId, targetUserId, newRole, performingUserId) {
    this.logger.info(`Attempting to update role of user ID: ${targetUserId} in team ID: ${teamId} to ${newRole} by user ID: ${performingUserId}.`);

    if (!Object.values(TeamRole).includes(newRole)) {
        this.logger.warn(`Invalid role: ${newRole} specified for user ID: ${targetUserId} in team ID: ${teamId}.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role specified.');
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
        this.logger.warn(`Team not found for ID: ${teamId} during update member role attempt.`);
        throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    const memberToUpdate = await this.teamMemberRepository.findByTeamAndUser(teamId, targetUserId);
    if (!memberToUpdate || memberToUpdate.status !== 'active') {
      this.logger.warn(`Active member (User ID: ${targetUserId}) not found or not active in team ID: ${teamId} for role update.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Active team member not found or member is not active.');
    }

    if (newRole === TeamRole.OWNER) {
      this.logger.warn(`Attempt to assign OWNER role via UpdateTeamMemberRole by user ID: ${performingUserId}. Use ChangeTeamOwnerUseCase.`);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot change role to OWNER using this operation. Use change team ownership.');
    }

    const performingUserMembership = await this.teamMemberRepository.findByTeamAndUser(teamId, performingUserId);
    if (!performingUserMembership || performingUserMembership.status !== 'active') {
        this.logger.warn(`Performing user ID: ${performingUserId} is not an active member of team ID: ${teamId}.`);
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to perform this action.');
    }

    // Authorization:
    // Only Owner can change roles of Admin and Member.
    // Owner cannot have their role changed by this use case.
    // Admins cannot change any roles.
    if (performingUserMembership.role !== TeamRole.OWNER) {
      this.logger.warn(`User ID: ${performingUserId} (Role: ${performingUserMembership.role}) is not authorized to change member roles in team ID: ${teamId}. Owner required.`);
      throw new ApiError(httpStatus.FORBIDDEN, 'Only the team owner can change member roles.');
    }

    if (memberToUpdate.role === TeamRole.OWNER) {
      // This check is defensive; newRole === TeamRole.OWNER is already blocked.
      // This ensures the owner's current role isn't changed away from OWNER by this UC.
      this.logger.warn(`Attempt to change role of current owner (User ID: ${targetUserId}) in team ID: ${teamId}. Not allowed.`);
      throw new ApiError(httpStatus.BAD_REQUEST, "Cannot change the team owner's role using this operation.");
    }

    if (memberToUpdate.role === newRole) {
        this.logger.info(`User ID: ${targetUserId} in team ID: ${teamId} already has role ${newRole}. No update needed.`);
        return memberToUpdate.get({ plain: true });
    }

    try {
      // Repository's updateByTeamAndUser should also prevent changing role TO owner.
      const updatedMember = await this.teamMemberRepository.updateByTeamAndUser(teamId, targetUserId, { role: newRole });
      if (!updatedMember) {
          this.logger.error(`Failed to update role for member UserID:${targetUserId} in TeamID:${teamId}. Member not found by repo method.`);
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update member role.');
      }
      this.logger.info(`Role of user ID: ${targetUserId} in team ID: ${teamId} updated to ${newRole} by user ID: ${performingUserId}.`);
      // Optionally send notification to the user whose role changed.
      return updatedMember.get({ plain: true });
    } catch (error) {
        this.logger.error(`Error updating role for UserID:${targetUserId} in TeamID:${teamId}: ${error.message}`, { error });
        if (error.message.toLowerCase().includes('cannot directly change role to owner')) {
            throw new ApiError(httpStatus.BAD_REQUEST, error.message);
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to update role: ${error.message}`);
    }
  }
}

module.exports = UpdateTeamMemberRoleUseCase;
