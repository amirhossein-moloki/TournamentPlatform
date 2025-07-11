const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const TeamRole = require('../../../domain/team/teamRole.enums');

class AddTeamMemberUseCase {
  constructor({ teamRepository, userRepository, teamMemberRepository, notificationService, logger }) {
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.notificationService = notificationService;
    this.logger = logger;
  }

  async execute(teamId, targetUserId, roleToAssign, invitedByUserId) {
    this.logger.info(`Attempting to add user ID: ${targetUserId} to team ID: ${teamId} with role: ${roleToAssign} by user ID: ${invitedByUserId}`);

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      this.logger.warn(`Team not found for ID: ${teamId} during add member attempt.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'Team not found.');
    }

    const inviterMembership = await this.teamMemberRepository.findByTeamAndUser(teamId, invitedByUserId);
    if (!inviterMembership || (inviterMembership.role !== TeamRole.OWNER && inviterMembership.role !== TeamRole.ADMIN) || inviterMembership.status !== 'active') {
      this.logger.warn(`User ID: ${invitedByUserId} is not authorized to add members to team ID: ${teamId}. Role: ${inviterMembership?.role}, Status: ${inviterMembership?.status}`);
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to add members to this team.');
    }

    if (roleToAssign === TeamRole.OWNER) {
        this.logger.warn(`Attempt to assign OWNER role via AddTeamMemberUseCase by user ID: ${invitedByUserId} for team ID: ${teamId}.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot assign OWNER role directly. Use change ownership functionality.');
    }

    // Ensure admin cannot assign admin role if inviter is also an admin (only owner can create other admins)
    if (inviterMembership.role === TeamRole.ADMIN && roleToAssign === TeamRole.ADMIN) {
        this.logger.warn(`Admin (User ID: ${invitedByUserId}) attempting to assign ADMIN role in team ID: ${teamId}. Not allowed.`);
        throw new ApiError(httpStatus.FORBIDDEN, 'Admins cannot assign other admins. Only the team owner can.');
    }


    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      this.logger.warn(`Target user ID: ${targetUserId} not found during add member attempt for team ID: ${teamId}.`);
      throw new ApiError(httpStatus.NOT_FOUND, 'User to be added not found.');
    }

    if (targetUserId === invitedByUserId) {
        this.logger.warn(`User ID: ${invitedByUserId} attempting to add self to team ID: ${teamId}. This is not allowed in this flow.`);
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot add yourself to the team using this operation.');
    }

    try {
      // Default status for new members added by admin/owner is 'invited'
      // A separate use case like 'JoinTeamWithInviteToken' would change status to 'active'
      const initialStatus = 'invited';
      const newMember = await this.teamMemberRepository.add(teamId, targetUserId, roleToAssign, initialStatus, invitedByUserId);

      this.logger.info(`User ID: ${targetUserId} invited to team ID: ${teamId} with role: ${roleToAssign}.`);

      if (this.notificationService) {
        try {
            const inviter = await this.userRepository.findById(invitedByUserId);
            // This is a placeholder for actual notification logic
            // In a real app, you'd generate an invitation link/token here or in the notification service
            await this.notificationService.sendTeamInvitation({
              toEmail: targetUser.email, // Assuming user model has email
              teamName: team.name,
              inviterName: inviter ? inviter.username : 'A team admin',
              // Pass necessary details for the notification service to construct the message and link
            });
            this.logger.info(`Invitation notification sent for user ID: ${targetUserId} for team ID: ${teamId}.`);
        } catch (notificationError) {
            this.logger.error(`Failed to send invitation notification to ${targetUser.email} for team ${team.name}: ${notificationError.message}`, {notificationError});
            // Decide if this failure should roll back the member addition or just log. Usually, just log.
        }
      }

      return newMember.get({ plain: true });
    } catch (error) {
      this.logger.error(`Error adding/inviting member UserID:${targetUserId} to TeamID:${teamId}: ${error.message}`, { error });
      if (error.message.includes('already an active member or has a pending invitation')) {
          throw new ApiError(httpStatus.CONFLICT, error.message);
      }
      // Handle other specific errors from repository if necessary
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to add/invite member: ${error.message}`);
    }
  }
}

module.exports = AddTeamMemberUseCase;
