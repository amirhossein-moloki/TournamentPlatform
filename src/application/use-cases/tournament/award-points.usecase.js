const { IUserRepository } = require('../../../domain/user/user.repository.interface');
const { ITournamentRepository } = require('../../../domain/tournament/tournament.repository.interface');
const { RankService } = require('../../user/rank.service');

class AwardPointsUseCase {
  constructor(userRepository, tournamentRepository, rankService) {
    this.userRepository = userRepository;
    this.tournamentRepository = tournamentRepository;
    this.rankService = rankService;
  }

  async execute(tournamentId, results) {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'COMPLETED') {
      throw new Error('Tournament is not completed yet');
    }

    for (const result of results) {
      const { userId, points } = result;
      await this.rankService.addPoints(userId, points);
    }
  }
}

module.exports = { AwardPointsUseCase };
