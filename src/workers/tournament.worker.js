const { Tournament, TournamentStatus } = require('../domain/tournament/tournament.entity');
const { getDependencies } = require('../config/dependencies');

class TournamentWorker {
  constructor() {
    const { tournamentRepository } = getDependencies();
    this.tournamentRepository = tournamentRepository;
  }

  async run() {
    console.log('Running tournament worker...');
    const tournaments = await this.tournamentRepository.find({
      status: TournamentStatus.UPCOMING,
      startDate: { $lte: new Date() },
    });

    for (const tournament of tournaments) {
      console.log(`Tournament ${tournament.name} has reached its start time. Updating status to AWAITING_DECISION.`);
      tournament.updateStatus(TournamentStatus.AWAITING_DECISION);
      await this.tournamentRepository.update(tournament);
    }
  }
}

module.exports = TournamentWorker;
