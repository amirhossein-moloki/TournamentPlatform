const TeamInvitation = require('../../../domain/team/teamInvitation.entity');

class PostgresTeamInvitationRepository {
  constructor({ TeamInvitationModel }) {
    this.TeamInvitationModel = TeamInvitationModel;
  }

  async create(invitation) {
    const newInvitation = await this.TeamInvitationModel.create(invitation);
    return new TeamInvitation(newInvitation);
  }

  async findById(id) {
    const invitation = await this.TeamInvitationModel.findByPk(id);
    return invitation ? new TeamInvitation(invitation) : null;
  }

  async findPendingInvitation(teamId, userId) {
    const invitation = await this.TeamInvitationModel.findOne({
      where: {
        teamId,
        userId,
        status: 'PENDING',
      },
    });
    return invitation ? new TeamInvitation(invitation) : null;
  }

  async update(invitation) {
    await this.TeamInvitationModel.update(invitation, {
      where: { id: invitation.id },
    });
    return invitation;
  }
}

module.exports = PostgresTeamInvitationRepository;
