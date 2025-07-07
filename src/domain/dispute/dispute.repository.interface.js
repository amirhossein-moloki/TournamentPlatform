/**
 * @interface DisputeRepositoryInterface
 * Defines the contract for dispute ticket data persistence operations.
 */
class DisputeRepositoryInterface {
  /**
   * Finds a dispute ticket by its ID.
   * @param {string} id - The UUID of the dispute ticket.
   * @param {object} [options] - Optional parameters, e.g., for transaction.
   * @returns {Promise<import('./dispute.entity').DisputeTicket|null>} The DisputeTicket entity if found, otherwise null.
   */
  async findById(id, options = {}) {
    throw new Error('Method "findById" not implemented.');
  }

  /**
   * Creates a new dispute ticket.
   * @param {import('./dispute.entity').DisputeTicket|object} disputeData - The DisputeTicket entity or data to persist.
   * @param {object} [options] - Optional parameters, e.g., for transaction.
   * @returns {Promise<import('./dispute.entity').DisputeTicket>} The created DisputeTicket entity.
   */
  async create(disputeData, options = {}) {
    throw new Error('Method "create" not implemented.');
  }

  /**
   * Updates an existing dispute ticket (e.g., status, resolutionDetails, moderatorId).
   * @param {string} id - The ID of the dispute ticket to update.
   * @param {object} updateData - An object containing fields to update.
   * @param {object} [options] - Optional parameters, e.g., for transaction.
   * @returns {Promise<import('./dispute.entity').DisputeTicket|null>} The updated DisputeTicket entity, or null if not found.
   */
  async update(id, updateData, options = {}) {
    throw new Error('Method "update" not implemented.');
  }

  /**
   * Lists all dispute tickets with pagination and filtering.
   * @param {object} listOptions - Options for listing.
   * @param {number} [listOptions.page=1] - Page number.
   * @param {number} [listOptions.limit=10] - Items per page.
   * @param {object} [listOptions.filters] - Filters (e.g., { status, matchId, moderatorId, tournamentId }).
   * @param {string} [listOptions.sortBy='createdAt'] - Field to sort by.
   * @param {string} [listOptions.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @param {object} [options] - Optional parameters, e.g., for transaction.
   * @returns {Promise<{disputes: Array<import('./dispute.entity').DisputeTicket>, total: number, page: number, limit: number}>} Paginated list.
   */
  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' } = {}, options = {}) {
    throw new Error('Method "findAll" not implemented.');
  }

  /**
   * Finds a dispute ticket by match ID.
   * Since a match should ideally have at most one open dispute, this might return one or null.
   * @param {string} matchId - The ID of the match.
   * @param {object} [options] - Optional parameters, e.g., for transaction.
   * @returns {Promise<import('./dispute.entity').DisputeTicket|null>} The DisputeTicket entity if found, otherwise null.
   */
  async findByMatchId(matchId, options = {}) {
    throw new Error('Method "findByMatchId" not implemented.');
  }
}

module.exports = DisputeRepositoryInterface;

// Note:
// - The DisputeTicket type referred to would be a domain entity, presumably defined in `src/domain/dispute/dispute.entity.js`.
//   This entity file needs to be created if it doesn't exist.
// - Methods support transaction options for consistency, although not all operations might require them.
// - `findAll` includes common pagination, filtering, and sorting parameters.
// - `findByMatchId` is included as it's a common lookup requirement for disputes.`DisputeRepositoryInterface.js` has been created in `src/domain/dispute/`.
// This interface defines the contract for dispute data operations.
//
// Next, I need to create the corresponding domain entity `src/domain/dispute/dispute.entity.js`. The database migration for `DisputeTickets` provides the schema for this.
