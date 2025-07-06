const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetMatchUseCase {
  /**
   * @param {object} tournamentRepository - Repository for fetching tournament and match data.
   * @param {object} userGameProfileRepository - Repository for fetching user in-game names.
   * @param {object} matchRepository - (Optional) Dedicated MatchRepository.
   */
  constructor(tournamentRepository, userGameProfileRepository, matchRepository = null) {
    this.tournamentRepository = tournamentRepository; // Used for finding match and its tournament
    this.userGameProfileRepository = userGameProfileRepository;
    this.matchRepository = matchRepository || tournamentRepository; // Fallback to tournamentRepository if no dedicated matchRepo
  }

  /**
   * Retrieves a specific match by its ID.
   * @param {string} matchId - The ID of the match to retrieve.
   * @param {string} [requestingUserId] - Optional: ID of the user requesting the match, for authorization checks.
   * @returns {Promise<import('../../../domain/tournament/match.entity').Match>} The Match domain entity.
   * @throws {ApiError} If the match is not found or access is denied.
   */
  async execute(matchId, requestingUserId = null) {
    if (!matchId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Match ID is required.');
    }

    // The findMatchById method in PostgresTournamentRepository currently takes (matchId, options)
    const matchData = await this.matchRepository.findMatchById(matchId, { includeTournament: true });

    if (!matchData) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    // Assuming matchData is a domain entity or an object that can be converted to one.
    // And it includes tournament.id and tournament.gameId (or similar path to gameId)
    // For simplicity, let's assume matchData.tournament.gameId exists.
    // If not, an additional fetch for the tournament might be needed if matchData only has tournamentId.

    let gameId;
    if (matchData.tournament && matchData.tournament.gameId) {
        gameId = matchData.tournament.gameId;
    } else if (matchData.tournamentId) {
        // If gameId is not directly available, fetch the tournament to get its gameId
        const tournament = await this.tournamentRepository.findById(matchData.tournamentId);
        if (!tournament || !tournament.gameId) {
            throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Could not determine game for the match.');
        }
        gameId = tournament.gameId;
        // Optionally attach full tournament info to matchData if not already there
        if(!matchData.tournament) matchData.tournament = tournament;
    } else {
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Match data is missing tournament information.');
    }


    // Enhance participant details with inGameName
    // This assumes participant1Id and participant2Id are user IDs.
    // And participant1Type/participant2Type would be 'user' if this distinction exists.
    const participantDetails = {};

    if (matchData.participant1Id) {
        const profile1 = await this.userGameProfileRepository.findByUserIdAndGameId(matchData.participant1Id, gameId);
        participantDetails.participant1InGameName = profile1 ? profile1.inGameName : null;
        // Optionally, include full user details if needed, e.g., from a UserRepository
        // participantDetails.participant1Username = ... (fetch from UserRepository if matchData.participant1 is not populated)
    }
    if (matchData.participant2Id) {
        const profile2 = await this.userGameProfileRepository.findByUserIdAndGameId(matchData.participant2Id, gameId);
        participantDetails.participant2InGameName = profile2 ? profile2.inGameName : null;
    }

    // Combine original match data with new participant details
    // The structure of the returned object can be a DTO (Data Transfer Object)
    const matchWithInGameNames = {
      ...matchData, // Spread the original match properties (or matchData.toPlainObject() if it's an entity)
      ...participantDetails, // Add in-game names
    };

    // Optional: Authorization logic (as before)
    // if (requestingUserId) { ... }

    return matchWithInGameNames;
  }
}

module.exports = GetMatchUseCase;

// Notes:
// - Now injects UserGameProfileRepository.
// - Assumes matchRepository.findMatchById can include tournament details or matchData has tournamentId.
// - Fetches gameId from the tournament associated with the match.
// - Fetches in-game names for participants using gameId and participant IDs.
// - Returns an enhanced match object including these in-game names.
// - This structure assumes participants are users. If teams are involved, logic for team in-game names would be needed.
