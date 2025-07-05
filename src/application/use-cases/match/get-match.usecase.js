const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetMatchUseCase {
  /**
   * @param {object} tournamentRepository - Repository for fetching match data.
   *                                      (Could be a dedicated MatchRepository in the future).
   */
  constructor(tournamentRepository) {
    this.tournamentRepository = tournamentRepository;
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
    // It does not inherently take tournamentId as a top-level param if matchId is global.
    const match = await this.tournamentRepository.findMatchById(matchId);

    if (!match) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Match not found.');
    }

    // Optional: Authorization logic
    // For example, if matches are not public and only participants or admins can view them.
    // if (requestingUserId) {
    //   const isParticipant = match.participant1Id === requestingUserId || match.participant2Id === requestingUserId;
    //   // const isAdmin = await checkUserRole(requestingUserId, 'Admin'); // Needs UserRepository
    //   if (!isParticipant /* && !isAdmin */) {
    //     throw new ApiError(httpStatusCodes.FORBIDDEN, 'You are not authorized to view this match.');
    //   }
    // }

    // Returns the full Match domain entity.
    // The presentation layer can decide what parts of it to expose (e.g., via a DTO or specific properties).
    return match;
  }
}

module.exports = GetMatchUseCase;

// Notes:
// - Fetches a single match by its ID.
// - Relies on `tournamentRepository.findMatchById()`.
// - Includes a placeholder for authorization logic if needed (e.g., only participants/admins can view).
//   This would require passing the `requestingUserId` and potentially `UserRepository` for role checks.
// - Returns the Match domain entity.
// - The `tournamentRepository.findMatchById` method in `PostgresTournamentRepository` has signature `async findMatchById(matchId, options = {})`.
//   This use case calls it as `findMatchById(matchId)`. This is compatible as `options` is optional.
//   If transaction support or other options were needed here, they could be passed.
