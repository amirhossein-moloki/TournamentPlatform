const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums');

class RemoveTeamMemberUseCase {
  constructor({ teamMemberRepository, teamRepository, logger }) {
    this.teamMemberRepository = teamMemberRepository;
    this.teamRepository = teamRepository;
    this.logger = logger;
  }

  async execute(teamId, targetUserId, performingUserId) {
    this.logger.info(`Attempting to remove user ID: ${targetUserId} from team ID: ${teamId} by user ID: ${performingUserId}.`);

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
        this.logger.warn(`Team not found for ID: ${teamId} during remove member attempt.`);
        throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    const memberToRemove = await this.teamMemberRepository.findByTeamAndUser(teamId, targetUserId);
    if (!memberToRemove) {
      this.logger.warn(`Member (User ID: ${targetUserId}) not found in team ID: ${teamId} for removal.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found.');
    }

    const performingUserMembership = await this.teamMemberRepository.findByTeamAndUser(teamId, performingUserId);

    if (!performingUserMembership || performingUserMembership.status !== 'active') {
        this.logger.warn(`Performing user ID: ${performingUserId} is not an active member of team ID: ${teamId}, cannot remove members.`);
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to perform this action.');
    }

    if (memberToRemove.role === TeamRole.OWNER) {
      this.logger.warn(`Attempt to remove team owner (User ID: ${targetUserId}) from team ID: ${teamId} by user ID: ${performingUserId}. Not allowed.`);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot remove the team owner. Change ownership first.');
    }

    if (performingUserId === targetUserId) {
      // User leaving team. Owner case already handled.
      this.logger.info(`User ID: ${performingUserId} is leaving team ID: ${teamId}.`);
    } else {
      // Admin/Owner removing another member
      if (performingUserMembership.role === TeamRole.MEMBER) {
        this.logger.warn(`User ID: ${performingUserId} (Role: ${performingUserMembership.role}) is not authorized to remove other members from team ID: ${teamId}.`);
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to remove this member. Requires Admin or Owner role.');
      }
      if (performingUserMembership.role === TeamRole.ADMIN && (memberToRemove.role === TeamRole.ADMIN || memberToRemove.role === TeamRole.OWNER)) {
          this.logger.warn(`Admin (User ID: ${performingUserId}) attempting to remove another Admin/Owner (User ID: ${targetUserId}) from team ID: ${teamId}. Not allowed.`);
          throw new ApiError(httpStatus.FORBIDDEN, 'Admins cannot remove other admins or the owner.');
      }
      // Owner can remove anyone except themselves (handled by owner check on memberToRemove)
    }

    try {
      // The repository's removeByTeamAndUser method should not allow removing the owner.
      const deletedCount = await this.teamMemberRepository.removeByTeamAndUser(teamId, targetUserId);
      if (deletedCount === 0) {
        this.logger.error(`Failed to remove member (User ID: ${targetUserId}) from team ID: ${teamId}. Repository reported 0 deleted rows.`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to remove team member.');
      }
      this.logger.info(`User ID: ${targetUserId} removed from team ID: ${teamId} by user ID: ${performingUserId}.`);
      // Optionally, send notification to the removed user or team admins.
      return { message: 'Team member removed successfully.' };
    } catch (error) {
        this.logger.error(`Error removing member UserID:${targetUserId} from TeamID:${teamId}: ${error.message}`, { error });
        if (error.message.toLowerCase().includes('cannot remove the team owner')) {
            throw new ApiError(httpStatus.BAD_REQUEST, error.message);
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to remove member: ${error.message}`);
    }
  }
}

module.exports = RemoveTeamMemberUseCase;
