const { Match, MatchStatus } = require('../../../domain/tournament/match.entity');
const { v4: uuidv4 } = require('uuid');

class StartSingleMatch {
  constructor({ matchRepository, tournamentParticipantRepository }) {
    this.matchRepository = matchRepository;
    this.tournamentParticipantRepository = tournamentParticipantRepository;
  }

  async execute(tournament) {
    const participants = await this.tournamentParticipantRepository.findByTournamentId(tournament.id);

    if (participants.length < 2) {
      // Or handle this case as a cancellation
      throw new Error('Not enough participants to start a match.');
    }

    const matchId = uuidv4();
    const match = new Match(
      matchId,
      tournament.id,
      1, // roundNumber
      1, // matchNumberInRound
      participants[0].userId,
      participants[1].userId,
      MatchStatus.SCHEDULED
    );

    // In a real application, you would have a more sophisticated way
    // of selecting participants for the match.
    // For now, we just take the first two.

    await this.matchRepository.create(match);
  }
}

module.exports = StartSingleMatch;
