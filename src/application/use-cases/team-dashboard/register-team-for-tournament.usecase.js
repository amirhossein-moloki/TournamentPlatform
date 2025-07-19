const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class RegisterTeamForTournamentUseCase {
  constructor({ teamRepository, tournamentRepository, walletRepository, teamMemberRepository }) {
    this.teamRepository = teamRepository;
    this.tournamentRepository = tournamentRepository;
    this.walletRepository = walletRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  async execute({ teamId, tournamentId, memberIds, leaderId }) {
    if (!teamId || !tournamentId || !memberIds || !leaderId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Team ID, Tournament ID, Member IDs and Leader ID are required.');
    }

    const team = await this.teamRepository.findById(teamId);
    if (!team || team.ownerId !== leaderId) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not the leader of this team.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament not found.');
    }

    if (tournament.entryFee > 0) {
      for (const memberId of memberIds) {
        const member = await this.teamMemberRepository.findByTeamIdAndUserId(teamId, memberId);
        if (!member) {
          throw new ApiError(httpStatusCodes.BAD_REQUEST, `Member with ID ${memberId} is not in this team.`);
        }
        const wallet = await this.walletRepository.findByUserId(memberId);
        if (!wallet || wallet.balance < tournament.entryFee) {
          throw new ApiError(httpStatusCodes.BAD_REQUEST, `Member with ID ${memberId} has insufficient funds.`);
        }
      }
    }

    // Here you would typically deduct the entry fee from each member's wallet
    // and then register the team for the tournament.
    // This is a simplified version.

    await this.tournamentRepository.registerTeam(tournamentId, teamId, memberIds);
  }
}

module.exports = RegisterTeamForTournamentUseCase;
