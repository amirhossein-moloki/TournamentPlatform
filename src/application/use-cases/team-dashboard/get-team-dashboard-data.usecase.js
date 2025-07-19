const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetTeamDashboardDataUseCase {
  constructor({ teamRepository, teamMemberRepository }) {
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  async execute({ teamId }) {
    if (!teamId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Team ID is required.');
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Team not found.');
    }

    const members = await this.teamMemberRepository.findByTeamId(teamId);
    const totalWinnings = members.reduce((acc, member) => acc + member.winnings, 0);

    return {
      team: team.toPlainObject(),
      members: members.map(m => m.toPlainObject()),
      stats: {
        totalWinnings,
      },
    };
  }
}

module.exports = GetTeamDashboardDataUseCase;
