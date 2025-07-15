const { BadRequestError, NotFoundError, InternalServerError } = require('../../../utils/errors');

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
   * @throws {import('../../../utils/errors').BadRequestError} If tournamentId is not provided.
   * @throws {import('../../../utils/errors').NotFoundError} If tournament not found.
   * @throws {import('../../../utils/errors').InternalServerError} If any other error occurs.
   */
  async execute({ id, include }) {
    if (!id) {
      throw new BadRequestError('Tournament ID is required.');
    }

    const findOptions = {
      includeGame: true,
      includeParticipants: include && include.includes('participants'),
    };

    try {
      const tournament = await this.tournamentRepository.findById(id, findOptions);

      if (!tournament) {
        throw new NotFoundError(`Tournament with ID ${tournamentId} not found.`);
      }
      return tournament;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error; // Re-throw specific errors directly
      }
      // Log the original error for server-side debugging
      console.error('Error fetching tournament by ID:', error);
      // Throw a generic error for other types of exceptions
      throw new InternalServerError('Failed to retrieve tournament.');
    }
  }
}

module.exports = GetTournamentUseCase;
