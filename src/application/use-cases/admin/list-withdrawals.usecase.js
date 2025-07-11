const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class ListWithdrawalsUseCase {
  /**
   * @param {import('../../../domain/wallet/transaction.repository.interface')} transactionRepository
   */
  constructor(transactionRepository) {
    if (!transactionRepository || typeof transactionRepository.findAll !== 'function') {
      throw new Error('ListWithdrawalsUseCase requires a valid transactionRepository with a findAll method.');
    }
    this.transactionRepository = transactionRepository;
  }

  /**
   * Retrieves a list of withdrawal transactions for admin review/management.
   * Filters specifically for transactions of type 'WITHDRAWAL' and relevant statuses.
   * @param {object} listOptions - Options for listing.
   * @param {number} [listOptions.page=1] - Page number.
   * @param {number} [listOptions.limit=10] - Items per page.
   * @param {object} [listOptions.filters] - Additional filters (e.g., { status, userId }).
   * @param {string} [listOptions.sortBy='createdAt'] - Field to sort by (usually `createdAt` or `transactionDate`).
   * @param {string} [listOptions.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{withdrawals: Array<import('../../../domain/wallet/transaction.entity').Transaction>, totalItems: number, totalPages: number, currentPage: number, pageSize: number}>}
   * @throws {ApiError} If fetching fails.
   */
  async execute({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' }) {
    const sanePage = Math.max(1, parseInt(page, 10) || 1);
    let saneLimit = Math.max(1, parseInt(limit, 10) || 10);
    if (saneLimit > 100) saneLimit = 100; // Max limit

    // Ensure we are always filtering for withdrawal-related transactions
    const specificFilters = {
      ...filters,
      type: 'WITHDRAWAL', // Core filter for this use case
      // By default, might only show those needing action, e.g. 'REQUIRES_APPROVAL'
      // Or allow 'status' to be passed in filters to see 'APPROVED', 'REJECTED', etc.
    };
    if (filters.status === 'ALL_WITHDRAWALS') { // Example custom filter to see all, not just pending
        delete specificFilters.status; // Remove status filter if 'ALL' is requested
    } else if (!filters.status) {
        // Default to showing withdrawals needing action if no specific status filter is applied
        // This depends on application policy. Example:
        // specificFilters.status = 'REQUIRES_APPROVAL';
    }


    try {
      const result = await this.transactionRepository.findAll({ // Using the generic findAll
        page: sanePage,
        limit: saneLimit,
        filters: specificFilters,
        sortBy,
        sortOrder,
      });

      if (!result || typeof result.total !== 'number' || !Array.isArray(result.transactions) ||
          typeof result.page !== 'number' || typeof result.limit !== 'number') {
        console.error('Invalid response structure from transactionRepository.findAll:', result);
        throw new Error('Failed to retrieve withdrawals due to repository error.');
      }

      const totalPages = Math.ceil(result.total / saneLimit);

      return {
        withdrawals: result.transactions, // Already domain entities
        totalItems: result.total,
        totalPages,
        currentPage: result.page,
        pageSize: result.limit,
      };
    } catch (error) {
      console.error('Error listing withdrawals in use case:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve withdrawal requests.');
    }
  }
}

module.exports = ListWithdrawalsUseCase;

// Notes:
// - Specifically for listing withdrawal requests for admin.
// - Uses `transactionRepository.findAll` but enforces `type: 'WITHDRAWAL'` filter.
// - Allows additional filtering by status, userId, etc., passed via `filters` option.
// - Includes an example of how a custom filter like `status: 'ALL_WITHDRAWALS'` could be handled,
//   or how a default status filter (e.g., only 'REQUIRES_APPROVAL') could be applied.
// - Returns paginated list of Transaction domain entities.
// - `PostgresTransactionRepository.findAll` already supports the required parameters.
