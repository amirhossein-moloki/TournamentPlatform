const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class UpdateTournamentDetailsUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   * @param {import('../../../domain/game/game.repository.interface')} gameRepository
   */
  constructor(tournamentRepository, gameRepository) {
    this.tournamentRepository = tournamentRepository;
    this.gameRepository = gameRepository;
  }

  /**
   * Executes the use case to update tournament details.
   * @param {string} tournamentId - The ID of the tournament to update.
   * @param {object} updateData - Data to update.
   * @param {string} [updateData.name] - New name.
   * @param {string} [updateData.gameId] - New game ID.
   * @param {string} [updateData.description] - New description.
   * @param {string} [updateData.rules] - New rules.
   * @param {number} [updateData.entryFee] - New entry fee.
   * @param {number} [updateData.prizePool] - New prize pool.
   * @param {number} [updateData.maxParticipants] - New max participants.
   * @param {Date} [updateData.startDate] - New start date.
   * @param {Date} [updateData.endDate] - New end date.
   * @param {string} [updateData.bannerImageUrl] - New banner image URL.
   * @param {string} [updateData.bracketType] - New bracket type.
   * @param {object} [updateData.settings] - New settings object.
   * @returns {Promise<import('../../../domain/tournament/tournament.entity').Tournament>} The updated tournament.
   */
  async execute(tournamentId, updateData) {
    if (!tournamentId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID is required.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
    }

    // Validate gameId if provided
    if (updateData.gameId && updateData.gameId !== tournament.gameId) {
      const game = await this.gameRepository.findById(updateData.gameId);
      if (!game) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${updateData.gameId} not found.`);
      }
      // Potentially check if game is active if that's a requirement
    }

    // Use the entity's method to update details
    // This method should encapsulate the business logic for what can be updated and when.
    try {
      tournament.updateDetails(updateData); // This method is in `tournament.entity.js`
    } catch (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, error.message);
    }

    // Persist changes
    const updatedTournament = await this.tournamentRepository.update(tournamentId, tournament.toPlainObject ? tournament.toPlainObject() : tournament ); // Pass updated fields

    if (!updatedTournament) {
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update tournament after validation.');
    }

    return updatedTournament;
  }
}

module.exports = UpdateTournamentDetailsUseCase;
