const { Tournament, TournamentStatus } = require('../../../domain/tournament/tournament.entity');
const { Match, MatchStatus } = require('../../../domain/tournament/match.entity');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');

class DecideTournament {
  constructor({ tournamentRepository, matchRepository, userRepository, startSingleMatch, refundEntryFees }) {
    this.tournamentRepository = tournamentRepository;
    this.matchRepository = matchRepository;
    this.userRepository = userRepository;
    this.startSingleMatch = startSingleMatch;
    this.refundEntryFees = refundEntryFees;
  }

  async execute(tournamentId, managerId, decision) {
    const manager = await this.userRepository.findById(managerId);
    if (!manager || !manager.hasRole('TOURNAMENT_MANAGER')) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'Only tournament managers can decide on a tournament.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Tournament not found');
    }

    if (tournament.status !== TournamentStatus.AWAITING_DECISION) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Tournament is not awaiting a decision. Current status: ${tournament.status}`);
    }

    if (decision === 'start') {
      if (tournament.isSingleMatch) {
        await this.startSingleMatch.execute(tournament);
      } else {
        // For now, we only handle single match tournaments.
        // In the future, we can add logic to start other types of tournaments.
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Starting this type of tournament is not yet implemented.');
      }
      tournament.updateStatus(TournamentStatus.ONGOING);
      await this.tournamentRepository.update(tournament);
      return { message: 'Tournament started successfully.' };
    } else if (decision === 'cancel') {
      await this.refundEntryFees.execute(tournament);
      tournament.cancelTournament('Canceled by tournament manager.');
      await this.tournamentRepository.update(tournament);
      return { message: 'Tournament canceled successfully.' };
    } else {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid decision. Must be "start" or "cancel".');
    }
  }
}

module.exports = DecideTournament;
