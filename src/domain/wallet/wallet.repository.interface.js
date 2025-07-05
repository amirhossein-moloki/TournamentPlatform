/**
 * @interface WalletRepositoryInterface
 * Defines the contract for wallet data persistence operations.
 * Implementations of this interface will handle the actual database interactions.
 */
class WalletRepositoryInterface {
  /**
   * Finds a wallet by its ID.
   * @param {string} id - The UUID of the wallet.
   * @returns {Promise<Wallet|null>} The Wallet entity if found, otherwise null.
   */
  async findById(id) {
    throw new Error('Method "findById" not implemented.');
  }

  /**
   * Finds a wallet by the user ID it belongs to.
   * Since a user typically has only one wallet, this should return a single wallet or null.
   * @param {string} userId - The UUID of the user.
   * @returns {Promise<Wallet|null>} The Wallet entity if found, otherwise null.
   */
  async findByUserId(userId) {
    throw new Error('Method "findByUserId" not implemented.');
  }

  /**
   * Creates a new wallet.
   * @param {Wallet|object} walletData - The Wallet entity instance or data object to persist.
   *        If an object, it should contain fields like id, userId, balance, currency.
   * @returns {Promise<Wallet>} The created Wallet entity.
   */
  async create(walletData) {
    throw new Error('Method "create" not implemented.');
  }

  /**
   * Updates an existing wallet, typically its balance.
   * @param {string} id - The ID of the wallet to update.
   * @param {object} updateData - An object containing fields to update.
   *                              Primarily: { balance }
   *                              Optionally: { currency } if currency changes are supported (rare).
   * @param {object} [options] - Optional parameters, e.g., for optimistic locking or transaction.
   * @param {object} [options.transaction] - A database transaction object if operation is part of a larger transaction.
   * @returns {Promise<Wallet|null>} The updated Wallet entity, or null if not found or update failed.
   */
  async update(id, updateData, options = {}) {
    throw new Error('Method "update" not implemented.');
  }

  /**
   * Deletes a wallet by its ID.
   * Note: This is a sensitive operation. Consider if wallets should be soft-deleted or archived instead.
   * Also, consider what happens to associated transactions.
   * @param {string} id - The ID of the wallet to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  async delete(id) {
    throw new Error('Method "delete" not implemented.');
  }

  // Transaction-related methods that might be part of WalletRepository,
  // although a dedicated TransactionRepository is usually preferred for managing transactions.
  // If included here, they operate in the context of a specific wallet.

  /**
   * Adds a transaction record associated with a wallet.
   * (This might better belong in a TransactionRepository, but listed here if Wallet repo manages this).
   * @param {string} walletId - The ID of the wallet.
   * @param {Transaction|object} transactionData - The Transaction entity or data to create.
   * @returns {Promise<Transaction>} The created Transaction entity.
   */
  // async addTransaction(walletId, transactionData) {
  //   throw new Error('Method "addTransaction" not implemented.');
  // }

  /**
   * Finds a transaction by its ID.
   * (Belongs in TransactionRepositoryInterface)
   */
  // async findTransactionById(transactionId) {
  //   throw new Error('Method "findTransactionById" not implemented.');
  // }

  /**
   * Lists all transactions for a given wallet with pagination and filtering.
   * (This is more likely to be in TransactionRepository, but a simplified version could be here).
   * @param {string} walletId - The ID of the wallet.
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - The page number.
   * @param {number} [options.limit=10] - The number of transactions per page.
   * @param {object} [options.filters] - Optional filters (e.g., { type: 'DEPOSIT', status: 'COMPLETED' }).
   * @param {string} [options.sortBy='transactionDate'] - Field to sort by.
   * @param {string} [options.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{transactions: Transaction[], total: number, page: number, limit: number}>} Paginated list of transactions.
   */
  // async findAllTransactionsByWalletId({ walletId, page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
  //   throw new Error('Method "findAllTransactionsByWalletId" not implemented.');
  // }

  /**
   * Updates a transaction's status or other details.
   * (Belongs in TransactionRepositoryInterface)
   */
  // async updateTransaction(transactionId, updateData) {
  //   throw new Error('Method "updateTransaction" not implemented.');
  // }
}

module.exports = WalletRepositoryInterface;

// Note:
// The Wallet type referred to in return types is the domain entity `Wallet` from `wallet.entity.js`.
// The Transaction type is from `transaction.entity.js`.
// Transaction-related methods are commented out as they are better placed in a dedicated
// TransactionRepositoryInterface. A WalletRepository should primarily focus on the Wallet aggregate.
// The `update` method includes an `options` parameter, which is common for passing database transaction
// objects (e.g., from Sequelize) to ensure atomicity when wallet operations are part of a larger workflow.
// This interface defines the contract for how the application layer interacts with wallet persistence,
// abstracting away the specific database technology.
