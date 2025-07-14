const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class ListTournamentParticipantsUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   */
  constructor(tournamentRepository) {
    this.tournamentRepository = tournamentRepository;
  }

  /**
   * Executes the use case to list participants for a tournament.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {object} options - Pagination options.
   * @param {number} [options.page=1] - Page number.
   * @param {number} [options.limit=10] - Items per page.
   * // Add other filter/sort options if needed for participants (e.g., by registration date, by name if details are fetched)
   * @returns {Promise<{participants: Array<object>, totalItems: number, totalPages: number, currentPage: number, pageSize: number}>}
   */
  async execute(tournamentId, { page = 1, limit = 10 }) {
    if (!tournamentId) {
      throw new BadRequestError('Tournament ID is required.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundError(`Tournament with ID ${tournamentId} not found.`);
    }

    // The TournamentRepositoryInterface has findAllParticipants(tournamentId, options)
    // The implementation in PostgresTournamentRepository is findParticipantsByTournamentId(tournamentId, options)
    // For now, let's assume the interface is the contract and the implementation might need aliasing or direct call.
    // Or, the repository implementation of findAllParticipants should handle pagination.
    // The current `findParticipantsByTournamentId` in `PostgresTournamentRepository` does not do pagination itself.
    // It fetches all and then expects consumer to paginate, or it needs an update.
    // Let's assume for now it's updated to handle pagination or we fetch all and paginate here.
    // For simplicity, if repo doesn't paginate, we'll paginate fetched results here. This is not ideal for large datasets.

    // Ideal: Repository handles pagination
    // const result = await this.tournamentRepository.findAllParticipants(tournamentId, { page, limit });
    // return {
    //   participants: result.participants, // Array of participant domain entities or plain objects
    //   totalItems: result.total,
    //   totalPages: Math.ceil(result.total / limit),
    //   currentPage: result.page,
    //   pageSize: result.limit,
    // };

    // Current reality: findParticipantsByTournamentId fetches all. We must paginate manually.
    // This is NOT scalable and PostgresTournamentRepository.findParticipantsByTournamentId should be updated.
    // However, to proceed with current repo capabilities:
    const allParticipants = await this.tournamentRepository.findParticipantsByTournamentId(tournamentId, {}); // Empty options for now

    const totalItems = allParticipants.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedParticipants = allParticipants.slice(startIndex, endIndex);

    // The participant objects might be simple records from TournamentParticipantModel.
    // We might want to enrich them with user details (username, etc.).
    // This would require fetching User details for each participantId.
    // For now, returning them as is. Enrichment can be a future step or handled by repo.

    return {
      participants: paginatedParticipants, // These are likely TournamentParticipant entities/objects
      totalItems: totalItems,
      totalPages: totalPages,
      currentPage: parseInt(page, 10),
      pageSize: parseInt(limit, 10),
    };
  }
}

module.exports = ListTournamentParticipantsUseCase;
