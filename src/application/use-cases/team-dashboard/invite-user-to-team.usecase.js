const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class InviteUserToTeamUseCase {
  constructor({ teamRepository, userRepository, teamInvitationRepository }) {
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.teamInvitationRepository = teamInvitationRepository;
  }

  async execute({ teamId, userId, inviterId }) {
    if (!teamId || !userId || !inviterId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Team ID, User ID and Inviter ID are required.');
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Team not found.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
    }

    const existingInvitation = await this.teamInvitationRepository.findPendingInvitation(teamId, userId);
    if (existingInvitation) {
      throw new ApiError(httpStatusCodes.CONFLICT, 'User has a pending invitation for this team.');
    }

    await this.teamInvitationRepository.create({
      teamId,
      userId,
      inviterId,
    });
  }
}

module.exports = InviteUserToTeamUseCase;
