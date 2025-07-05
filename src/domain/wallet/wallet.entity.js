/**
 * Represents a User's Wallet in the system.
 * This class encapsulates the properties and core business logic of a wallet.
 */
class Wallet {
  /**
   * @param {string} id - The unique identifier for the wallet (UUID).
   * @param {string} userId - The ID of the user this wallet belongs to.
   * @param {number} balance - The current balance of the wallet.
   * @param {string} currency - The currency code for the wallet (e.g., 'USD').
   * @param {Date} [createdAt] - Timestamp of when the wallet was created.
   * @param {Date} [updatedAt] - Timestamp of when the wallet was last updated.
   * @param {Array<Transaction>} [transactions] - Optional: In-memory list of recent transactions (not typically part of core entity state).
   */
  constructor(
    id,
    userId,
    balance = 0.00,
    currency = 'USD', // Default currency, should align with system config
    createdAt = new Date(),
    updatedAt = new Date(),
    transactions = [] // Primarily for conceptual completeness, repo handles transaction fetching
  ) {
    if (!id) throw new Error('Wallet ID is required.');
    if (!userId) throw new Error('User ID for wallet is required.');
    if (balance == null || typeof balance !== 'number' || balance < 0) {
      throw new Error('Valid initial balance is required and must be non-negative.');
    }
    if (!currency || currency.length !== 3) { // Basic currency code validation
      throw new Error('Valid currency code (e.g., USD) is required.');
    }

    this.id = id;
    this.userId = userId;
    // Ensure balance is stored and handled with appropriate precision.
    // For domain entity, using number is fine. DB layer handles DECIMAL.
    this._balance = parseFloat(balance.toFixed(2)); // Store with 2 decimal places internally
    this.currency = currency.toUpperCase();
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this._transactions = transactions; // Internal list, mostly illustrative
  }

  /**
   * Gets the current balance.
   * @returns {number} The current balance.
   */
  get balance() {
    return this._balance;
  }

  /**
   * Deposits an amount into the wallet.
   * @param {number} amount - The amount to deposit. Must be positive.
   * @returns {void}
   * @throws {Error} If the amount is invalid.
   */
  deposit(amount) {
    if (amount == null || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Deposit amount must be a positive number.');
    }
    this._balance = parseFloat((this._balance + amount).toFixed(2));
    this.updatedAt = new Date();
    // In a real system, a Transaction record would be created by an application service.
  }

  /**
   * Withdraws an amount from the wallet.
   * @param {number} amount - The amount to withdraw. Must be positive.
   * @returns {void}
   * @throws {Error} If the amount is invalid or exceeds balance.
   */
  withdraw(amount) {
    if (amount == null || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Withdrawal amount must be a positive number.');
    }
    if (amount > this._balance) {
      throw new Error('Insufficient funds for withdrawal.');
    }
    this._balance = parseFloat((this._balance - amount).toFixed(2));
    this.updatedAt = new Date();
    // A Transaction record would be created by an application service.
  }

  /**
   * Checks if the wallet has sufficient funds for a given amount.
   * @param {number} amount - The amount to check.
   * @returns {boolean} True if funds are sufficient, false otherwise.
   */
  hasSufficientFunds(amount) {
    if (amount == null || typeof amount !== 'number' || amount < 0) {
      throw new Error('Amount to check must be a non-negative number.');
    }
    return this._balance >= amount;
  }

  /**
   * Updates wallet details.
   * Currently, only currency might be updatable, but this is rare for a wallet.
   * Or other metadata if added.
   * @param {object} details - Details to update.
   * @param {string} [details.currency] - New currency code.
   */
  updateDetails(details) {
    if (details.currency) {
      if (details.currency.length !== 3) {
        throw new Error('Invalid currency code for update.');
      }
      // Currency conversion logic would be complex and is out of scope for this basic entity.
      // Typically, a wallet's currency is fixed upon creation.
      // This method is a placeholder for other potential updatable fields.
      // this.currency = details.currency.toUpperCase();
      console.warn('Wallet currency updates are complex and generally not supported this way.');
    }
    this.updatedAt = new Date();
  }

  // Transaction management methods are typically not part of the Wallet entity itself,
  // as Transactions are separate entities and their lifecycle is managed by services
  // and persisted by a TransactionRepository. The Wallet entity primarily cares about its balance.
  // However, one might add methods to get recent transactions if the entity held them,
  // but that's usually a repository/service concern for query performance.
  // addTransactionRecord(transaction) {
  //   this._transactions.push(transaction); // Simplified
  //   this.updatedAt = new Date();
  // }
}

module.exports = { Wallet };
