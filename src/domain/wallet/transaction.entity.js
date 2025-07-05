/**
 * Represents a financial Transaction in the system, related to a Wallet.
 */
class Transaction {
  /**
   * @param {string} id - The unique identifier for the transaction (UUID).
   * @param {string} walletId - The ID of the wallet this transaction belongs to.
   * @param {string} type - Type of transaction (e.g., 'DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND').
   * @param {number} amount - The monetary amount of the transaction. Always positive.
   * @param {string} status - Current status of the transaction (e.g., 'PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REQUIRES_APPROVAL').
   * @param {string|null} idempotencyKey - Optional unique key to prevent duplicate processing.
   * @param {string|null} description - Optional description of the transaction.
   * @param {object|null} metadata - Optional additional data related to the transaction (e.g., payment gateway details, related entity IDs).
   * @param {Date} [transactionDate] - The date the transaction occurred or was processed. Defaults to now.
   * @param {Date} [createdAt] - Timestamp of when the transaction record was created.
   * @param {Date} [updatedAt] - Timestamp of when the transaction record was last updated.
   */
  constructor(
    id,
    walletId,
    type,
    amount,
    status = 'PENDING',
    idempotencyKey = null,
    description = null,
    metadata = null,
    transactionDate = new Date(),
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    if (!id) throw new Error('Transaction ID is required.');
    if (!walletId) throw new Error('Wallet ID for transaction is required.');
    if (!type) throw new Error('Transaction type is required.'); // Validation of specific types can be in a service
    if (amount == null || typeof amount !== 'number' || amount <= 0) {
      // Amount should always be positive; type indicates direction (deposit/withdrawal)
      throw new Error('Transaction amount must be a positive number.');
    }
    if (!status) throw new Error('Transaction status is required.'); // Validation of specific statuses

    this.id = id;
    this.walletId = walletId;
    this.type = type;
    this.amount = parseFloat(amount.toFixed(2)); // Ensure 2 decimal places
    this.status = status;
    this.idempotencyKey = idempotencyKey;
    this.description = description;
    this.metadata = metadata || {}; // Default to empty object if null
    this.transactionDate = transactionDate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validTypes = ['DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT'];

  static Status = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELED: 'CANCELED',
    REQUIRES_APPROVAL: 'REQUIRES_APPROVAL', // For withdrawals needing admin action
    PROCESSING: 'PROCESSING',             // For transactions that are in an intermediate state
    REFUNDED: 'REFUNDED',
    REJECTED: 'REJECTED',                 // For withdrawals rejected by admin
    PAYMENT_FAILED: 'PAYMENT_FAILED',       // When gateway payment fails after approval/initiation
    ERROR_INSUFFICIENT_FUNDS_POST_PAYMENT: 'ERROR_INSUFFICIENT_FUNDS_POST_PAYMENT' // Critical error state
  };
  static validStatuses = Object.values(Transaction.Status);

  /**
   * Updates the status of the transaction.
   * @param {string} newStatus - The new status.
   * @param {string} [reason] - Optional reason for status change, appended to description.
   */
  updateStatus(newStatus, reason = null) {
    if (!Transaction.validStatuses.includes(newStatus)) {
      throw new Error(`Invalid transaction status: ${newStatus}.`);
    }
    this.status = newStatus;
    if (reason) {
      this.description = this.description ? `${this.description} | Status changed: ${reason}` : `Status changed: ${reason}`;
    }
    this.updatedAt = new Date();
  }

  /**
   * Marks the transaction as completed.
   * @param {object} [completionMetadata] - Optional metadata related to completion.
   */
  complete(completionMetadata = null) {
    if (this.status !== 'PENDING' && this.status !== 'PROCESSING' && this.status !== 'REQUIRES_APPROVAL') {
      throw new Error(`Transaction cannot be completed from status: ${this.status}.`);
    }
    this.updateStatus('COMPLETED');
    this.transactionDate = new Date(); // Mark completion time as the primary transaction date
    if (completionMetadata) {
      this.metadata = { ...this.metadata, ...completionMetadata };
    }
  }

  /**
   * Marks the transaction as failed.
   * @param {string} failureReason - Reason for failure.
   * @param {object} [failureMetadata] - Optional metadata related to failure.
   */
  fail(failureReason, failureMetadata = null) {
    if (!failureReason) throw new Error('Failure reason is required.');
    this.updateStatus('FAILED', failureReason);
    if (failureMetadata) {
      this.metadata = { ...this.metadata, ...failureMetadata };
    }
  }

  /**
   * Marks the transaction as canceled.
   * @param {string} cancelReason - Reason for cancellation.
   */
  cancel(cancelReason) {
    if (!cancelReason) throw new Error('Cancellation reason is required.');
    // Add logic: e.g., only PENDING or REQUIRES_APPROVAL transactions can be canceled.
    if (this.status !== 'PENDING' && this.status !== 'REQUIRES_APPROVAL') {
      throw new Error(`Transaction in status ${this.status} cannot be canceled.`);
    }
    this.updateStatus('CANCELED', cancelReason);
  }

  /**
   * Adds or updates metadata for the transaction.
   * @param {object} dataToAdd - Metadata to add or merge.
   */
  addMetadata(dataToAdd) {
    if (typeof dataToAdd !== 'object' || dataToAdd === null) {
      throw new Error('Metadata to add must be an object.');
    }
    this.metadata = { ...this.metadata, ...dataToAdd };
    this.updatedAt = new Date();
  }

  /**
   * Sets a description for the transaction.
   * @param {string} newDescription - The new description.
   */
  setDescription(newDescription) {
    this.description = newDescription;
    this.updatedAt = new Date();
  }

  /**
   * Checks if the transaction is of a certain type.
   * @param {string} typeToCheck - The type to check against.
   * @returns {boolean}
   */
  isType(typeToCheck) {
    return this.type === typeToCheck;
  }

  /**
   * Checks if the transaction has a certain status.
   * @param {string} statusToCheck - The status to check against.
   * @returns {boolean}
   */
  isStatus(statusToCheck) {
    return this.status === statusToCheck;
  }
}

module.exports = { Transaction };
