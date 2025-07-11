const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums');

class UpdateTeamMemberStatusUseCase {
  constructor({ teamMemberRepository, teamRepository, notificationService, logger }) {
    this.teamMemberRepository = teamMemberRepository;
    this.teamRepository = teamRepository;
    this.notificationService = notificationService; // For notifying admins/owner
    this.logger = logger;
  }

  async execute(teamId, performingUserId, newStatus, context = {}) { // context for things like invitationToken
    this.logger.info(`User ID: ${performingUserId} attempting to update their status in team ID: ${teamId} to ${newStatus}. Context:`, context);

    // Valid statuses that a user can transition themselves to.
    // 'kicked' would be set by an admin/owner, not by the user themselves.
    const validSelfUpdateStatuses = ['active', 'rejected', 'left'];
    if (!validSelfUpdateStatuses.includes(newStatus)) {
      this.logger.warn(`Invalid status: ${newStatus} for self-update by user ID: ${performingUserId} in team ID: ${teamId}.`);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status provided for this operation.');
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId} during member status update.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    const member = await this.teamMemberRepository.findByTeamAndUser(teamId, performingUserId);
    if (!member) {
      this.logger.warn(`Membership not found for user ID: ${performingUserId} in team ID: ${teamId}.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team membership not found.');
    }

    // Business logic for status transitions:
    if (newStatus === 'active') {
      // This implies accepting an invitation.
      // A more robust system would use an invitation token to validate this action.
      if (member.status !== 'invited') {
        this.logger.warn(`User ID: ${performingUserId} in team ID: ${teamId} tried to set status to 'active', but current status is ${member.status}.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot activate membership. Current status is not "invited".');
      }
      // Optional: Validate invitationToken from context if implementing token-based invites
      // if (!context.invitationToken || !this.validateInvitationToken(member, context.invitationToken)) {
      //   throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired invitation token.');
      // }
    } else if (newStatus === 'rejected') {
      if (member.status !== 'invited') {
        this.logger.warn(`User ID: ${performingUserId} in team ID: ${teamId} tried to reject invite, but current status is ${member.status}.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot reject invitation. Current status is not "invited".');
      }
    } else if (newStatus === 'left') {
      if (member.status !== 'active') {
        this.logger.warn(`User ID: ${performingUserId} in team ID: ${teamId} tried to leave, but current status is ${member.status}. Must be an active member.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Must be an active member to leave the team.');
      }
      if (member.role === TeamRole.OWNER) {
        this.logger.warn(`Owner (User ID: ${performingUserId}) attempted to leave team ID: ${teamId}. Not allowed.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Team owner cannot leave the team. Change ownership or delete the team.');
      }
    }

    if (member.status === newStatus) {
        this.logger.info(`User ID: ${performingUserId} in team ID: ${teamId} already has status ${newStatus}. No update needed.`);
        return member.get({ plain: true });
    }

    try {
      const updatedMember = await this.teamMemberRepository.updateByTeamAndUser(teamId, performingUserId, { status: newStatus });
      if (!updatedMember) {
          this.logger.error(`Failed to update status for member UserID:${performingUserId} in TeamID:${teamId}.`);
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update member status.');
      }
      this.logger.info(`Status of user ID: ${performingUserId} in team ID: ${teamId} updated to ${newStatus}.`);

      // Notify team owner/admins
      if (this.notificationService) {
        // Example: Notify owner when someone accepts an invitation or leaves the team
        if (newStatus === 'active' || newStatus === 'left' || newStatus === 'rejected') {
            // const owner = await this.userRepository.findById(team.ownerId); // Assuming team has ownerId
            // if(owner) {
            //    await this.notificationService.sendTeamMemberStatusUpdate({ toEmail: owner.email, ... });
            // }
        }
      }
      return updatedMember.get({ plain: true });
    } catch (error) {
        this.logger.error(`Error updating status for UserID:${performingUserId} in TeamID:${teamId}: ${error.message}`, { error });
        if (error.message.toLowerCase().includes('team owner cannot leave')) {
            throw new ApiError(httpStatus.BAD_REQUEST, error.message);
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to update status: ${error.message}`);
    }
  }

  // validateInvitationToken(member, token) { /* ... token validation logic ... */ }
}

module.exports = UpdateTeamMemberStatusUseCase;
