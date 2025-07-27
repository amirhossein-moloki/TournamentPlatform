const { ITournamentRepository } = require('../../../domain/tournament/tournament.repository.interface');

class GetTournamentHistoryUseCase {
  constructor(tournamentRepository) {
    this.tournamentRepository = tournamentRepository;
  }

  async execute(userId, options) {
    return this.tournamentRepository.findTournamentsByParticipantId(userId, options);
  }
}

module.exports = { GetTournamentHistoryUseCase };
