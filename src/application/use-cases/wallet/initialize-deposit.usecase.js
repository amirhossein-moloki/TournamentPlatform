const { v4: uuidv4 } = require('uuid');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { Transaction } = require('../../../domain/wallet/transaction.entity'); // Domain entity
// const { Wallet } = require('../../../domain/wallet/wallet.entity'); // Not directly manipulated here, but fetched

class InitializeDepositUseCase {
  /**
   * @param {object} walletRepository - Repository for wallet data.
   * @param {object} transactionRepository - Repository for transaction data.
   * @param {object} [idempotencyService] - Optional: A more sophisticated idempotency service.
   */
  constructor(walletRepository, transactionRepository, idempotencyService = null) {
    this.walletRepository = walletRepository;
    this.transactionRepository = transactionRepository;
    this.idempotencyService = idempotencyService; // For future advanced idempotency handling
  }

  /**
   * Initializes a deposit request.
   * @param {string} userId - The ID of the user initiating the deposit.
   * @param {number} amount - The amount to deposit.
   * @param {string} currency - The currency of the deposit (e.g., 'USD').
   * @param {string} idempotencyKey - A unique key to ensure the operation is processed only once.
   * @returns {Promise<{paymentGatewayUrl: string, transactionId: string, message: string}>}
   * @throws {ApiError} If validation fails, wallet not found, or idempotency check fails.
   */
  async execute(userId, amount, currency, idempotencyKey) {
    if (!userId || amount == null || !currency || !idempotencyKey) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID, amount, currency, and idempotency key are required.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Deposit amount must be a positive number.');
    }
    if (typeof currency !== 'string' || currency.length !== 3) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid currency code.');
    }

    // 1. Idempotency Check
    // A more robust idempotency service might store request fingerprints and responses.
    // For now, basic check against transaction idempotencyKey.
    const existingTransaction = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTransaction) {
      // If a transaction with this key exists, we need to decide how to respond.
      // If it's PENDING, it means it was already initiated.
      // If it's COMPLETED, it means it was already successfully processed.
      // If it's FAILED, policy might allow retry or require new key.
      // For simplicity: if PENDING or COMPLETED, return info about existing transaction.
      if (existingTransaction.status === 'PENDING' || existingTransaction.status === 'COMPLETED') {
        // Ensure the existing transaction matches the current request's key details (user, amount, currency)
        // This is a simplified check. A full check would compare more parameters if they were part of the idempotent request.
        const walletForExistingTx = await this.walletRepository.findById(existingTransaction.walletId);
        if (walletForExistingTx && walletForExistingTx.userId === userId &&
            parseFloat(existingTransaction.amount) === amount /*&& existingTransaction.currency === currency - Transaction entity does not store currency*/) {

            // Construct a conceptual payment gateway URL for the existing transaction
            const paymentGatewayUrl = `https://payment.gateway.com/pay/existing_tx_${existingTransaction.id}?amount=${existingTransaction.amount}&currency=${currency}`; // Assuming currency from request is what was intended
            return {
                message: `Deposit already initiated or completed (Idempotency). Status: ${existingTransaction.status}`,
                paymentGatewayUrl: paymentGatewayUrl,
                transactionId: existingTransaction.id,
            };
        } else {
            // Idempotency key collision with different parameters - this is an error.
            throw new ApiError(httpStatusCodes.CONFLICT, `Idempotency key ${idempotencyKey} already used with different request parameters.`);
        }
      } else {
        // e.g., if FAILED, and policy is to deny retry with same key.
        throw new ApiError(httpStatusCodes.CONFLICT, `Idempotency key ${idempotencyKey} corresponds to a transaction with status ${existingTransaction.status}. Cannot re-initiate.`);
      }
    }

    // 2. Get user's wallet
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    }
    // We could also check if wallet currency matches request currency if wallets are currency-specific
    // For now, assuming wallet can handle any currency transaction or gateway handles conversion.

    // 3. Create a PENDING transaction record
    const transactionId = uuidv4(); // Generate a new transaction ID
    const transactionEntity = new Transaction(
      transactionId,
      wallet.id,
      'DEPOSIT',
      amount,
      'PENDING', // Initial status
      idempotencyKey,
      `Wallet deposit initialization for ${amount} ${currency}.`,
      { // Metadata
        userId, // For audit/tracking
        requestedAmount: amount,
        requestedCurrency: currency,
        // Other details like payment method hint if provided by user
      },
      new Date() // transactionDate
    );

    await this.transactionRepository.create(transactionEntity);

    // 4. Prepare data for/redirect to payment gateway (conceptual)
    // In a real scenario, this might involve calling a payment gateway SDK
    // to get a redirect URL or parameters for a client-side integration.
    const paymentGatewayUrl = `https://payment.gateway.com/pay/new_tx_${transactionId}?amount=${amount}&currency=${currency}`;

    return {
      message: 'Deposit initialized successfully. Proceed to payment gateway.',
      paymentGatewayUrl,
      transactionId,
    };
  }
}

module.exports = InitializeDepositUseCase;

// Notes:
// - The use case handles basic validation and idempotency.
// - It creates a PENDING transaction before interacting with any (conceptual) payment gateway.
// - The `paymentGatewayUrl` is a placeholder. Real integration is more complex.
// - Error handling uses `ApiError` for consistent responses.
// - The idempotency check is simplified. A full solution would store request fingerprints
//   and potentially the original response to return if the request is replayed.
// - This use case does not modify the wallet balance; that happens in `ProcessDepositUseCase`
//   after successful payment confirmation from the gateway.
// - The Transaction domain entity doesn't store currency directly, but the metadata here does.
//   If multi-currency wallets are a feature, this might need refinement.
//   The Wallet entity has a currency, which this use case could check against.
//   For now, assuming the deposit currency is recorded in transaction metadata.
// - The `idempotencyService` parameter is a placeholder for a more advanced, dedicated service
//   if the current repository-based check becomes insufficient.
