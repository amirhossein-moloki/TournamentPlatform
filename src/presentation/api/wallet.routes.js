const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../../middleware/auth.middleware');
const InitializeDepositUseCase = require('../../application/use-cases/wallet/initialize-deposit.usecase');
const GetTransactionHistoryUseCase = require('../../application/use-cases/wallet/get-transaction-history.usecase');
const RequestWithdrawalUseCase = require('../../application/use-cases/wallet/request-withdrawal.usecase');
const { PostgresWalletRepository } = require('../../infrastructure/database/repositories/postgres.wallet.repository');
const { PostgresTransactionRepository } = require('../../infrastructure/database/repositories/postgres.transaction.repository');
const { appConfig } = require('../../../config/config');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
// const { v4: uuidv4 } = require('uuid'); // No longer needed here

const router = express.Router();

// Import database models
const dbModels = require('../../infrastructure/database/models'); // Correctly imports the db object

// Instantiate Repositories
const walletRepository = new PostgresWalletRepository(dbModels);
const transactionRepository = new PostgresTransactionRepository(dbModels);

// Instantiate Use Cases
// Note: InitializeDepositUseCase and RequestWithdrawalUseCase might need a notificationService
// or other dependencies in a full implementation.
const initializeDepositUseCase = new InitializeDepositUseCase(walletRepository, transactionRepository);
const getTransactionHistoryUseCase = new GetTransactionHistoryUseCase(walletRepository, transactionRepository);
const requestWithdrawalUseCase = new RequestWithdrawalUseCase(walletRepository, transactionRepository);
const GetWalletDetailsUseCase = require('../../application/use-cases/wallet/get-wallet-details.usecase');
// const processDepositUseCase = new ProcessDepositUseCase(walletRepository, transactionRepository, sequelize); // For webhook

// Instantiate Use Cases (continue)
const getWalletDetailsUseCase = new GetWalletDetailsUseCase(walletRepository);

// --- Schemas for Validation ---
const initializeDepositSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number.',
    'number.positive': 'Amount must be positive.',
    'number.precision': 'Amount must have no more than 2 decimal places.',
  }),
  currency: Joi.string().length(3).uppercase().required().messages({ // Basic currency validation
    'string.length': 'Currency must be a 3-letter code (e.g., USD).',
  }),
});

const requestWithdrawalSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).uppercase().required(),
  withdrawalMethodDetails: Joi.object({
    type: Joi.string().valid('PAYPAL', 'BANK_TRANSFER').required(),
    email: Joi.string().email().when('type', { is: 'PAYPAL', then: Joi.required(), otherwise: Joi.forbidden() }),
    accountHolderName: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required(), otherwise: Joi.forbidden() }),
    accountNumber: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required(), otherwise: Joi.forbidden() }),
    routingNumber: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.required(), otherwise: Joi.forbidden() }),
    bankName: Joi.string().when('type', { is: 'BANK_TRANSFER', then: Joi.optional().allow(null, ''), otherwise: Joi.forbidden() }),
  }).required().description('Details for the withdrawal method. Type determines required fields.'),
});

const transactionHistorySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    type: Joi.string().valid('DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT').optional(),
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REQUIRES_APPROVAL', 'PROCESSING', 'REFUNDED').optional(),
    sortBy: Joi.string().valid('transactionDate', 'amount').default('transactionDate'),
    sortOrder: Joi.string().uppercase().valid('ASC', 'DESC').default('DESC'),
});


// --- Route Handlers ---

/**
 * GET /api/v1/wallet
 * Get the wallet details for the authenticated user.
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const walletDetails = await getWalletDetailsUseCase.execute(userId);
    return new ApiResponse(res, httpStatusCodes.OK, 'Wallet details retrieved successfully.', walletDetails).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/wallet/deposit/initialize
 * Initialize the wallet top-up process.
 */
router.post('/deposit/initialize', authenticateToken, async (req, res, next) => {
  try {
    const idempotencyKey = req.header(appConfig.idempotencyKeyHeader); // 'X-Idempotency-Key'
    const { error: idempotencyError } = Joi.string().uuid().required().validate(idempotencyKey, {
        messages: {
            'any.required': `Header ${appConfig.idempotencyKeyHeader} is required.`,
            'string.guid': `Header ${appConfig.idempotencyKeyHeader} must be a valid UUID.`
        }
    });
    if (idempotencyError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, idempotencyError.details[0].message);
    }

    const { error, value: depositData } = initializeDepositSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;

    const result = await initializeDepositUseCase.execute(
      userId,
      depositData.amount,
      depositData.currency,
      idempotencyKey
    );

    return new ApiResponse(res, httpStatusCodes.OK, result.message, {
      paymentGatewayUrl: result.paymentGatewayUrl,
      transactionId: result.transactionId,
      // Include status if the use case returns it, especially for idempotent responses
      ...(result.status && { status: result.status }),
    }).send();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === httpStatusCodes.CONFLICT) {
      // Specific handling for idempotency conflicts if needed, or let global handler manage
      // For example, could return a 200 OK with the existing transaction details if that's the policy
      // The InitializeDepositUseCase already attempts to return existing transaction info for safe replays.
    }
    next(error);
  }
});

/**
 * GET /api/v1/wallet/history
 * Get transaction history for the logged-in user.
 */
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const { error, value: queryParams } = transactionHistorySchema.validate(req.query);
    if (error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    }

    const result = await getTransactionHistoryUseCase.execute(userId, queryParams);

    // The use case already formats the pagination data:
    // {transactions, totalItems, totalPages, currentPage, pageSize}
    // Map to PaginatedTransactionHistory schema: { page, limit, totalPages, totalItems, items: [TransactionHistoryItem] }
    const responseData = {
      page: result.currentPage,
      limit: result.pageSize,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      items: result.transactions.map(t => t.toPlainObject ? t.toPlainObject() : t) // Assuming toPlainObject() matches TransactionHistoryItem
    };
    return new ApiResponse(res, httpStatusCodes.OK, 'Transaction history retrieved.', responseData).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/wallet/withdrawals
 * Submit a withdrawal request for finance manager approval.
 */
router.post('/withdrawals', authenticateToken, async (req, res, next) => {
  try {
    const idempotencyKey = req.header(appConfig.idempotencyKeyHeader);
    const { error: idempotencyError } = Joi.string().uuid().required().validate(idempotencyKey, {
        messages: {
            'any.required': `Header ${appConfig.idempotencyKeyHeader} is required.`,
            'string.guid': `Header ${appConfig.idempotencyKeyHeader} must be a valid UUID.`
        }
    });
    if (idempotencyError) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, idempotencyError.details[0].message);
    }

    const { error, value: withdrawalData } = requestWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;

    const result = await requestWithdrawalUseCase.execute(
      userId,
      withdrawalData, // This is { amount, currency, withdrawalMethodDetails }
      idempotencyKey   // Pass the idempotency key (can be null/undefined if not provided)
    );
    // RequestWithdrawalUseCase returns { transaction: Transaction, message: string }

    // If the use case handles an idempotent replay by returning the existing transaction,
    // the status code might need to be adjusted based on the message or a specific flag.
    // For now, assuming a successful new request or a successful idempotent replay that the use case
    // formats appropriately within its message and transaction object.
    // A 202 is generally for new requests that are accepted for processing.
    // If idempotency returns an already completed/processed transaction, 200 OK might be better.
    // The use case returns "Withdrawal request already submitted or being processed (Idempotency)"
    // and the existing transaction. In this case, 200 OK is more appropriate.

    let statusCode = httpStatusCodes.ACCEPTED; // Default for new requests
    if (result.message && result.message.includes("already submitted or being processed (Idempotency)")) {
        statusCode = httpStatusCodes.OK;
    }

    return new ApiResponse(
        res,
        statusCode,
        result.message,
        { transactionId: result.transaction.id, status: result.transaction.status } // Return key details
    ).send();
  } catch (error) {
    // Handle specific errors from the use case, e.g., CONFLICT for non-matching idempotent requests
    if (error instanceof ApiError && error.statusCode === httpStatusCodes.CONFLICT) {
        // Let the global error handler manage this, or customize response if needed
    }
    next(error);
  }
});


module.exports = router;

// Notes:
// - Assumes PostgresTransactionRepository will be created and provides methods like `findByIdempotencyKey`, `create`, `findAllByWalletId`.
// - Placeholder comments for use cases. Direct repository usage for now.
// - Idempotency key handling is simplified in placeholders. A robust implementation
//   would store idempotency keys with request fingerprints and response bodies.
// - Withdrawal logic is simplified; a real system might involve holds on funds,
//   more detailed withdrawal method validation, and integration with payment processors.
// - Joi schemas are defined for input validation.
// - `appConfig.idempotencyKeyHeader` is used to get the header name.
// - The `PostgresWalletRepository` and `PostgresTransactionRepository` are needed.
//   These are planned for later steps in the infrastructure layer.
//   The code is written assuming these will be available.
// - `uuidv4` is used for generating transaction IDs in placeholder logic.
//   In a real use case, the domain entity or repository might handle ID generation.
// - For `/deposit/initialize`, the idempotency check is basic. Real checks would involve
//   comparing more of the payload if an idempotent request is re-tried.
// - For `/withdrawals`, idempotency key is noted as good practice but made optional in placeholder.
// - Using `httpStatusCodes.ACCEPTED` (202) for withdrawal request submission is appropriate as it's an async approval process.
// - The `Joi.string().uuid().validate(idempotencyKey).error === null` check was incorrect logic.
//   It should be `Joi.string().uuid().validate(idempotencyKey).error` (if error exists, it's bad).
//   However, the blueprint doesn't strictly mandate UUID for idempotency keys, just "unique transaction key".
//   So, for now, just checking for presence. Strict UUID validation can be added if required by policy.
//   The comment was updated to reflect this.
// - The `transactionHistorySchema` includes sorting options now.
// - `PostgresTransactionRepository` will need `findAllByWalletId` that supports pagination, filtering, and sorting.

// Placeholder for Zarinpal callback UseCase - would be properly imported
// const VerifyZarinpalDepositUseCase = require('../../application/use-cases/wallet/verify-zarinpal-deposit.usecase');
// const verifyZarinpalDepositUseCase = new VerifyZarinpalDepositUseCase(transactionRepository, walletRepository /*, zarinpalPaymentService */);

const zarinpalCallbackSchema = Joi.object({
    Authority: Joi.string().required(),
    Status: Joi.string().valid('OK', 'NOK').required(),
});

/**
 * GET /api/v1/wallet/deposit/callback
 * Zarinpal payment callback URL.
 */
router.get('/deposit/callback', async (req, res, next) => {
  try {
    const { error, value: callbackQuery } = zarinpalCallbackSchema.validate(req.query);
    if (error) {
      // Zarinpal might not show a nice error page if this fails, log and redirect to a generic error page
      console.error('Invalid Zarinpal callback query:', error.details);
      // Redirect to a generic frontend error page
      return res.redirect(`${appConfig.frontendUrl}/payment/failed?error=invalid_callback_params`);
    }

    const { Authority, Status } = callbackQuery;
    const clientIp = req.ip; // For Zarinpal verification if their API uses it

    // In a real scenario, this use case would interact with Zarinpal's verification API
    // For now, this is a placeholder for the logic.
    // const result = await verifyZarinpalDepositUseCase.execute(Authority, Status, clientIp);

    // --- Placeholder Logic ---
    let redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}`;
    if (Status === 'OK') {
      // Simulate finding transaction and verifying
      const mockTransaction = await transactionRepository.findByGatewayAuthority(Authority); // Assumes this method exists
      if (mockTransaction && mockTransaction.status === 'PENDING') { // PENDING or INITIATED
        // Simulate Zarinpal verification success
        const zarinpalVerificationSuccess = true; // Placeholder
        if (zarinpalVerificationSuccess) {
          // Simulate crediting wallet
          // await walletRepository.credit(mockTransaction.userId, mockTransaction.amount, 'USD', mockTransaction.id);
          // await transactionRepository.updateStatus(mockTransaction.id, 'COMPLETED');
          console.log(`Simulated Zarinpal payment success for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
          redirectUrl = `${appConfig.frontendUrl}/payment/success?transactionId=${mockTransaction.id}&authority=${Authority}`;
        } else {
          // await transactionRepository.updateStatus(mockTransaction.id, 'FAILED', { failureReason: 'Zarinpal verification failed' });
           console.log(`Simulated Zarinpal payment verification failed for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
          redirectUrl = `${appConfig.frontendUrl}/payment/failed?transactionId=${mockTransaction.id}&reason=verification_failed`;
        }
      } else if (mockTransaction && mockTransaction.status === 'COMPLETED') {
        console.log(`Simulated Zarinpal payment already completed for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
        redirectUrl = `${appConfig.frontendUrl}/payment/success?transactionId=${mockTransaction.id}&authority=${Authority}&status=already_completed`;
      } else {
         console.log(`Simulated Zarinpal callback - Transaction not found or not in PENDING state for Authority: ${Authority}`);
        redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}&reason=transaction_not_found_or_invalid_state`;
      }
    } else { // Status === 'NOK' (User cancelled or Zarinpal error before verification page)
        const mockTransaction = await transactionRepository.findByGatewayAuthority(Authority); // Assumes this method exists
        if (mockTransaction) {
            // await transactionRepository.updateStatus(mockTransaction.id, 'CANCELED', { failureReason: 'Payment canceled by user or Zarinpal (NOK)' });
            console.log(`Simulated Zarinpal payment NOK (canceled/failed) for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
            redirectUrl = `${appConfig.frontendUrl}/payment/failed?transactionId=${mockTransaction.id}&reason=payment_nok`;
        } else {
            console.log(`Simulated Zarinpal payment NOK (canceled/failed) for Authority: ${Authority}. Transaction not found.`);
            redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}&reason=payment_nok_tx_not_found`;
        }
    }
    // --- End Placeholder Logic ---

    // Redirect based on the outcome
    // res.redirect(result.redirectPath || `${appConfig.frontendUrl}/payment/failed`); // Use result from actual use case
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in Zarinpal callback:', error);
    // Generic error redirect, as we can't send JSON response to Zarinpal redirect
    res.redirect(`${appConfig.frontendUrl}/payment/error?code=internal_error`);
  }
});
