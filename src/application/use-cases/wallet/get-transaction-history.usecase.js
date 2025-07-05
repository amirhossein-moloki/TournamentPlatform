const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetTransactionHistoryUseCase {
  /**
   * @param {object} walletRepository - Repository for wallet data.
   * @param {object} transactionRepository - Repository for transaction data.
   */
  constructor(walletRepository, transactionRepository) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
  }

  /**
   * Retrieves the transaction history for a user's wallet.
   * @param {string} userId - The ID of the user.
   * @param {object} options - Pagination and filtering options.
   * @param {number} [options.page=1] - Page number.
   * @param {number} [options.limit=10] - Items per page.
   * @param {object} [options.filters] - Filters for transaction type, status, etc.
   * @param {string} [options.sortBy='transactionDate'] - Field to sort by.
   * @param {string} [options.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{transactions: Transaction[], total: number, page: number, limit: number}>}
   * @throws {ApiError} If wallet not found or other errors occur.
   */
  async execute(userId, { page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
    }

    // 1. Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      // This case should ideally not happen if users always have wallets upon creation.
      // However, good to handle it defensively.
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    }

    // 2. Fetch transaction history using the TransactionRepository
    const historyData = await this.transactionRepository.findAllByWalletId({
      walletId: wallet.id,
      page,
      limit,
      filters,
      sortBy,
      sortOrder,
    });

    // The repository method `findAllByWalletId` should already return data in the expected format:
    // { transactions: Transaction[], total: number, page: number, limit: number }
    // No further mapping is needed here if the repository returns domain entities.
    return historyData;
  }
}

module.exports = GetTransactionHistoryUseCase;

// Notes:
// - This use case orchestrates fetching the wallet and then its transactions.
// - It relies on `walletRepository.findByUserId` and `transactionRepository.findAllByWalletId`.
// - Pagination and filtering options are passed through to the transaction repository.
// - Assumes `transactionRepository.findAllByWalletId` returns domain `Transaction` entities
//   and the pagination metadata.
// - Error handling for "wallet not found" is included.
// - Validation of pagination/filter parameters (e.g., max limit, valid sort fields)
//   should ideally be handled by Joi schemas at the presentation layer (routes) before
//   this use case is called, but basic defaults are provided here.
