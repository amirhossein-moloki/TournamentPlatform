const { InternalServerError } = require('../../../utils/errors');

class ListDisputesUseCase {
  /**
   * @param {import('../../../domain/dispute/dispute.repository.interface')} disputeRepository
   */
  constructor(disputeRepository) {
    this.disputeRepository = disputeRepository;
  }

  /**
   * Retrieves a list of disputes with pagination and filtering for admin users.
   * @param {object} listOptions - Options for listing.
   * @param {number} [listOptions.page=1] - Page number.
   * @param {number} [listOptions.limit=10] - Items per page.
   * @param {object} [listOptions.filters] - Filters (e.g., { status, matchId, moderatorId, tournamentId }).
   * @param {string} [listOptions.sortBy='createdAt'] - Field to sort by.
   * @param {string} [listOptions.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{disputes: Array<import('../../../domain/dispute/dispute.entity').DisputeTicket>, totalItems: number, totalPages: number, currentPage: number, pageSize: number}>}
   * @throws {import('../../../utils/errors').InternalServerError} If fetching fails.
   */
  async execute({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' }) {
    const sanePage = Math.max(1, parseInt(page, 10) || 1);
    let saneLimit = Math.max(1, parseInt(limit, 10) || 10);
    if (saneLimit > 100) saneLimit = 100; // Max limit

    try {
      const result = await this.disputeRepository.findAll({
        page: sanePage,
        limit: saneLimit,
        filters,
        sortBy,
        sortOrder,
      });

      if (!result || typeof result.total !== 'number' || !Array.isArray(result.disputes) ||
          typeof result.page !== 'number' || typeof result.limit !== 'number') {
        console.error('Invalid response structure from disputeRepository.findAll:', result);
        throw new Error('Failed to retrieve disputes due to repository error.');
      }

      const totalPages = Math.ceil(result.total / saneLimit);

      // Disputes are already domain entities from the repository
      return {
        disputes: result.disputes,
        totalItems: result.total,
        totalPages,
        currentPage: result.page, // Use the page number returned by the repository
        pageSize: result.limit,   // Use the limit returned by the repository
      };
    } catch (error) {
      console.error('Error listing disputes in use case:', error);
      if (error instanceof InternalServerError) throw error;
      throw new InternalServerError('Failed to retrieve disputes.');
    }
  }
}

module.exports = ListDisputesUseCase;

// Notes:
// - This use case is for admin panel functionality.
// - It leverages `disputeRepository.findAll` which supports pagination, filtering, and sorting.
// - The repository is expected to return domain entities (`DisputeTicket`).
// - It calculates `totalPages` and structures the response for paginated API output.
// - JSDoc type imports are used for clarity.
// - The `filters` object can contain criteria like `status`, `matchId`, `moderatorId`, etc.
//   The `PostgresDisputeRepository.findAll` method directly uses these filters in its `whereClause`.
//   More complex filtering (e.g., by `tournamentId`) would require joins in the repository query.
//   The current `PostgresDisputeRepository.findAll` doesn't implement joins but can be extended.
