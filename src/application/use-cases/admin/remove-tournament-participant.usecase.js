const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class RemoveTournamentParticipantUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   * @param {import('../../../domain/user/user.repository.interface')} userRepository - To find user by participantId if it's a userId.
   */
  constructor(tournamentRepository, userRepository) { // Removed tournamentParticipantRepository as its methods are on TournamentRepository
    this.tournamentRepository = tournamentRepository;
    this.userRepository = userRepository; // Needed to ensure participantId (as userId) is valid
  }

  /**
   * Executes the use case to remove a participant from a tournament by their User ID.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} userIdToRemove - The User ID of the participant to remove.
   * @returns {Promise<void>}
   */
  async execute(tournamentId, userIdToRemove) {
    if (!tournamentId || !userIdToRemove) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID and User ID are required.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
    }

    // Check if the user to remove actually exists in the system
    const user = await this.userRepository.findById(userIdToRemove);
    if (!user) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, `User with ID ${userIdToRemove} not found.`);
    }

    // Find the specific participant entry using TournamentRepository's findParticipant method
    // participantType 'user' is assumed here. If teams can participate, this needs to be more flexible.
    const participantEntry = await this.tournamentRepository.findParticipant(tournamentId, userIdToRemove, 'user');
    if (!participantEntry || !participantEntry.id) { // Check for participantEntry and its ID (PK of the join table)
      throw new ApiError(httpStatusCodes.NOT_FOUND, `User ${userIdToRemove} is not registered in tournament ${tournamentId}.`);
    }

    // Restrictions on when a participant can be removed
    if ([tournament.Status.ONGOING, tournament.Status.COMPLETED, tournament.Status.CANCELED].includes(tournament.status)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Cannot remove participant from a tournament that is ${tournament.status}.`);
    }

    // Remove the participant using TournamentRepository's removeParticipant method,
    // which expects the ID of the TournamentParticipant record.
    const removed = await this.tournamentRepository.removeParticipant(tournamentId, participantEntry.id);
    if (!removed) {
      // removeParticipant in PostgresTournamentRepository already throws ApiError on failure or if not found.
      // So, this explicit check might be redundant if the repository handles it.
      // However, keeping it for robustness in case the repository's contract changes.
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to remove participant from tournament.');
    }

    // Decrement participant count is handled by PostgresTournamentRepository.removeParticipant method
    // which is called via this.tournamentRepository.removeParticipant.
    // So, no need to call decrementParticipantCount separately here.
    // await this.tournamentRepository.decrementParticipantCount(tournamentId);


    // TODO: Consider further actions:
    // - Emit an event (e.g., PARTICIPANT_REMOVED).
    // - Handle refunds if an entry fee was paid (this is a complex operation and likely a separate use case/service).
    // - If the tournament was full and registration closed due to max capacity, removing a participant
    //   might allow re-opening registration or pulling from a waitlist.
    // - Audit logging for admin actions.

    return; // Indicate success
  }
}

module.exports = RemoveTournamentParticipantUseCase;
