/**
 * @interface TransactionRepositoryInterface
 * Defines the contract for transaction data persistence operations.
 */
class TransactionRepositoryInterface {
  /**
   * Finds a transaction by its ID.
   * @param {string} id - The UUID of the transaction.
   * @returns {Promise<Transaction|null>} The Transaction entity if found, otherwise null.
   */
  async findById(id) {
    throw new Error('Method "findById" not implemented.');
  }

  /**
   * Finds a transaction by its Zarinpal authority code.
   * @param {string} authority - The Zarinpal authority code.
   * @returns {Promise<Transaction|null>} The Transaction entity if found, otherwise null.
   */
  async findByAuthority(authority) {
    throw new Error('Method "findByAuthority" not implemented.');
  }

  /**
   * Finds a transaction by its idempotency key.
   * Useful for ensuring exactly-once processing for operations like deposits.
   * @param {string} idempotencyKey - The idempotency key.
   * @returns {Promise<Transaction|null>} The Transaction entity if found, otherwise null.
   */
  async findByIdempotencyKey(idempotencyKey) {
    throw new Error('Method "findByIdempotencyKey" not implemented.');
  }

  /**
   * Lists all transactions for a given wallet with pagination and filtering.
   * @param {string} walletId - The ID of the wallet.
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - The page number.
   * @param {number} [options.limit=10] - The number of transactions per page.
   * @param {object} [options.filters] - Optional filters (e.g., { type: 'DEPOSIT', status: 'COMPLETED' }).
   * @param {string} [options.sortBy='transactionDate'] - Field to sort by.
   * @param {string} [options.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{transactions: Transaction[], total: number, page: number, limit: number}>} Paginated list of transactions.
   */
  async findAllByWalletId({ walletId, page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
    throw new Error('Method "findAllByWalletId" not implemented.');
  }

  /**
   * Lists all transactions based on provided filters, with pagination.
   * Useful for admin views or system-wide transaction queries.
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - The page number.
   * @param {number} [options.limit=10] - The number of transactions per page.
   * @param {object} [options.filters] - Optional filters (e.g., { userId: 'uuid', type: 'WITHDRAWAL', status: 'REQUIRES_APPROVAL' }).
   * @param {string} [options.sortBy='transactionDate'] - Field to sort by.
   * @param {string} [options.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{transactions: Transaction[], total: number, page: number, limit: number}>} Paginated list of transactions.
   */
  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
    throw new Error('Method "findAll" not implemented.');
  }

  /**
   * Creates a new transaction.
   * @param {Transaction|object} transactionData - The Transaction entity instance or data object to persist.
   * @returns {Promise<Transaction>} The created Transaction entity.
   */
  async create(transactionData) {
    throw new Error('Method "create" not implemented.');
  }

  /**
   * Updates an existing transaction, typically its status or metadata.
   * @param {string} id - The ID of the transaction to update.
   * @param {object} updateData - An object containing fields to update (e.g., { status, description, metadata }).
   * @param {object} [options] - Optional parameters, e.g., for optimistic locking or transaction.
   * @param {object} [options.transaction] - A database transaction object.
   * @returns {Promise<Transaction|null>} The updated Transaction entity, or null if not found or update failed.
   */
  async update(id, updateData, options = {}) {
    throw new Error('Method "update" not implemented.');
  }

  /**
   * Deletes a transaction by its ID.
   * Note: Deleting financial transactions is generally discouraged. Consider soft-delete or archival.
   * @param {string} id - The ID of the transaction to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  // async delete(id) {
  //   throw new Error('Method "delete" not implemented. Deleting transactions is generally discouraged.');
  // }
}

module.exports = TransactionRepositoryInterface;
// Note: The Transaction type referred to in return types is the domain entity `Transaction` from `transaction.entity.js`.
// The `findAll` method is added for more general querying capability, e.g., for admin panels.
// The `delete` method is commented out as physical deletion of financial records is usually not a good practice.
// If needed, it should be implemented with care (e.g., soft delete).
// `findByIdempotencyKey` is crucial for payment processing use cases.
// `findAllByWalletId` is the primary method for users to view their own transaction history.
