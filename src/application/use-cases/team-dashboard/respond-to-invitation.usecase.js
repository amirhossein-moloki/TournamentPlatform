const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { TeamRole } = require('../../../domain/team/teamRole.enums');

class RespondToInvitationUseCase {
  constructor({ teamInvitationRepository, teamMemberRepository }) {
    this.teamInvitationRepository = teamInvitationRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  async execute({ teamId, invitationId, userId, accept }) {
    if (!teamId || !invitationId || !userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Team ID, Invitation ID and User ID are required.');
    }

    const invitation = await this.teamInvitationRepository.findById(invitationId);
    if (!invitation || invitation.teamId !== teamId || invitation.userId !== userId) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Invitation not found.');
    }

    if (invitation.status !== 'PENDING') {
      throw new ApiError(httpStatusCodes.CONFLICT, 'Invitation has already been responded to.');
    }

    if (accept) {
      await this.teamMemberRepository.add({
        teamId,
        userId,
        role: TeamRole.MEMBER,
      });
      invitation.status = 'ACCEPTED';
    } else {
      invitation.status = 'REJECTED';
    }

    await this.teamInvitationRepository.update(invitation);
  }
}

module.exports = RespondToInvitationUseCase;
