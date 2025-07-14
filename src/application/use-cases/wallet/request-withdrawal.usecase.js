const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, ConflictError } = require('../../../utils/errors');
const { Transaction } = require('../../../domain/wallet/transaction.entity');
// const { Wallet } = require('../../../domain/wallet/wallet.entity'); // For type hinting if needed

class RequestWithdrawalUseCase {
  /**
   * @param {object} walletRepository - Repository for wallet data.
   * @param {object} transactionRepository - Repository for transaction data.
   * @param {object} [notificationService] - Optional: for notifying finance team.
   */
  constructor(walletRepository, transactionRepository, notificationService = null) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
    this.notificationService = notificationService;
  }

  /**
   * Creates a withdrawal request that requires approval.
   * @param {string} userId - The ID of the user requesting the withdrawal.
   * @param {object} withdrawalData - Details of the withdrawal.
   * @param {number} withdrawalData.amount - The amount to withdraw.
   * @param {string} withdrawalData.currency - The currency.
   * @param {object} withdrawalData.withdrawalMethodDetails - Specifics of the withdrawal method (e.g., bank details, PayPal email).
   * @param {string|null} [idempotencyKey] - Optional key for idempotency.
   * @returns {Promise<{transaction: Transaction, message: string}>}
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').NotFoundError}
   * @throws {import('../../../utils/errors').ConflictError}
   */
  async execute(userId, { amount, currency, withdrawalMethodDetails }, idempotencyKey = null) {
    if (!userId || amount == null || !currency || !withdrawalMethodDetails) {
      throw new BadRequestError('User ID, amount, currency, and withdrawal method details are required.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Withdrawal amount must be a positive number.');
    }
    // Add more validation for currency, withdrawalMethodDetails structure as needed.

    // 1. Idempotency Check (if key provided)
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
      if (existingTransaction) {
        // Simplified: if a transaction with this key exists, assume it's a duplicate request.
        // A more robust check would involve comparing payload details.
        // If status is PENDING_APPROVAL or similar, inform user.
        if (['REQUIRES_APPROVAL', 'PENDING', 'PROCESSING', 'APPROVED'].includes(existingTransaction.status)) {
             const walletForExistingTx = await this.walletRepository.findById(existingTransaction.walletId);
             if (walletForExistingTx && walletForExistingTx.userId === userId &&
                parseFloat(existingTransaction.amount) === amount /* && compare withdrawalMethodDetails */) {
                return {
                    transaction: existingTransaction, // Return the existing transaction
                    message: `Withdrawal request already submitted or being processed (Idempotency). Status: ${existingTransaction.status}`,
                };
            } else {
                 throw new ConflictError(`Idempotency key ${idempotencyKey} already used with different request parameters.`);
            }
        }
        // If FAILED, policy might allow retry or require new key.
      }
    }

    // 2. Get user's wallet and check balance
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundError('User wallet not found.');
    }
    if (!wallet.hasSufficientFunds(amount)) {
      throw new BadRequestError('Insufficient balance for withdrawal.');
    }
    // Note: Currency check (wallet.currency vs withdrawalData.currency) might be needed if system is multi-currency.

    // 3. Create a 'REQUIRES_APPROVAL' transaction record
    // In a real system, you might also "hold" the funds in the wallet.
    // This could be done by creating a preliminary "HOLD" transaction or by updating the wallet's
    // "availableBalance" vs "totalBalance". For simplicity, we're not implementing holds here,
    // but the available balance check is crucial. The actual debit happens after approval.

    const transactionId = uuidv4();
    const withdrawalTransaction = new Transaction(
      transactionId,
      wallet.id,
      'WITHDRAWAL',
      amount,
      'REQUIRES_APPROVAL', // Initial status for withdrawals
      idempotencyKey, // Store if provided
      `Withdrawal request for ${amount} ${currency}. Method: ${JSON.stringify(withdrawalMethodDetails)}`,
      { // Metadata
        userId,
        requestedAmount: amount,
        requestedCurrency: currency,
        withdrawalMethodDetails,
        // any other relevant info for finance team
      },
      new Date() // transactionDate
    );

    const createdTransaction = await this.transactionRepository.create(withdrawalTransaction);

    // 4. (Optional) Notify finance team / system
    if (this.notificationService && typeof this.notificationService.notifyFinanceOfWithdrawalRequest === 'function') {
      try {
        await this.notificationService.notifyFinanceOfWithdrawalRequest(createdTransaction);
      } catch (notifyError) {
        // Log error, but don't fail the withdrawal request itself for notification failure
        console.error('Failed to send withdrawal request notification to finance:', notifyError);
      }
    }
    // Alternatively, this could be an event published to a message queue that a notification service consumes.

    return {
      transaction: createdTransaction,
      message: 'Withdrawal request submitted successfully and is pending approval.',
    };
  }
}

module.exports = RequestWithdrawalUseCase;

// Notes:
// - This use case creates a transaction with status 'REQUIRES_APPROVAL'.
// - Actual fund debit from wallet should occur *after* approval by a finance manager
//   (handled by a separate use case, e.g., ProcessWithdrawalUseCase).
// - Idempotency is considered.
// - Balance check is performed.
// - A conceptual `notificationService` is included for alerting relevant parties.
//   In a real system, this could be an email, a message queue event, or a dashboard update.
// - The structure of `withdrawalMethodDetails` would depend on the payment methods
//   supported by the platform (e.g., PayPal, bank transfer, crypto).
// - The transaction description includes stringified withdrawal method details for quick reference.
//   Sensitive parts of these details should be handled carefully (e.g., not logged excessively, encrypted if stored long-term).
// - The `idempotencyKey` check is simplified. A full solution might store more details about the original request
//   associated with the key to ensure subsequent requests with the same key are identical.
