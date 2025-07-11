// src/application/use-cases/tournament/get-tournament.usecase.js

const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetTournamentUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   */
  constructor(tournamentRepository) {
    if (!tournamentRepository || typeof tournamentRepository.findById !== 'function') {
      throw new Error('GetTournamentUseCase requires a valid tournamentRepository with a findById method.');
    }
    this.tournamentRepository = tournamentRepository;
  }

  /**
   * Executes the use case to get a specific tournament.
   * @param {string} tournamentId - The ID of the tournament to retrieve.
   * @param {object} [options] - Optional parameters for fetching (e.g., { includeGame: true, includeOrganizer: true, includeParticipants: false }).
   * @returns {Promise<import('../../../domain/tournament/tournament.entity').Tournament|null>} The tournament entity or null if not found.
   * @throws {ApiError} If tournamentId is not provided, tournament not found, or other error occurs.
   */
  async execute(tournamentId, options = {}) {
    if (!tournamentId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID is required.');
    }

    // Default options for includes, can be overridden by passed options
    const defaultOptions = {
        includeGame: true,
        includeOrganizer: true,
        // Add other common includes here if needed, e.g., includeParticipants: false
    };
    const findOptions = { ...defaultOptions, ...options };

    try {
      const tournament = await this.tournamentRepository.findById(tournamentId, findOptions);

      if (!tournament) {
        throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
      }
      return tournament;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error; // Re-throw ApiErrors directly
      }
      // Log the original error for server-side debugging
      console.error('Error fetching tournament by ID:', error);
      // Throw a generic error for other types of exceptions
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve tournament.');
    }
  }
}

module.exports = GetTournamentUseCase;
