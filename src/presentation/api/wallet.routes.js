const express = require('express');
const Joi = require('joi');
const { authenticateToken } = require('../../middleware/auth.middleware');
// const InitializeDepositUseCase = require('../../application/use-cases/wallet/initialize-deposit.usecase');
// const GetTransactionHistoryUseCase = require('../../application/use-cases/wallet/get-transaction-history.usecase');
// const RequestWithdrawalUseCase = require('../../application/use-cases/wallet/request-withdrawal.usecase');
const PostgresWalletRepository = require('../../infrastructure/database/repositories/postgres.wallet.repository');
const PostgresTransactionRepository = require('../../infrastructure/database/repositories/postgres.transaction.repository'); // Needed for history, potentially others
const { appConfig } = require('../../../config/config');
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const { v4: uuidv4 } = require('uuid'); // For generating idempotency keys or transaction IDs if needed by placeholder

const router = express.Router();

const walletRepository = new PostgresWalletRepository();
const transactionRepository = new PostgresTransactionRepository();

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
  withdrawalMethodDetails: Joi.object().required().min(1).description('Details for the withdrawal method, e.g., PayPal email, bank account info.'),
  // Example for withdrawalMethodDetails:
  // paypal: Joi.object({ email: Joi.string().email().required() })
  // bank: Joi.object({ accountNumber: Joi.string().required(), routingNumber: Joi.string().required() })
  // This should be more specific based on supported methods.
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
 * POST /api/v1/wallet/deposit/initialize
 * Initialize the wallet top-up process.
 */
router.post('/deposit/initialize', authenticateToken, async (req, res, next) => {
  try {
    const idempotencyKey = req.header(appConfig.idempotencyKeyHeader); // 'X-Idempotency-Key'
    if (!idempotencyKey || !Joi.string().uuid().validate(idempotencyKey).error === null) {
        // throw new ApiError(httpStatusCodes.BAD_REQUEST, `Header ${appConfig.idempotencyKeyHeader} is required and must be a UUID.`);
        // For now, allow non-UUID for easier testing if UUID is too strict for dev.
        // A stricter check: if (!idempotencyKey || Joi.string().uuid().validate(idempotencyKey).error) { ... }
        if (!idempotencyKey) {
             throw new ApiError(httpStatusCodes.BAD_REQUEST, `Header ${appConfig.idempotencyKeyHeader} is required.`);
        }
    }

    const { error, value: depositData } = initializeDepositSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;

    // const initializeDeposit = new InitializeDepositUseCase(walletRepository, transactionRepository);
    // const result = await initializeDeposit.execute(userId, depositData.amount, depositData.currency, idempotencyKey);

    // --- Placeholder Logic ---
    // 1. Check idempotency: Has this key been processed for this user with same payload?
    //    - If yes and succeeded, return original success response.
    //    - If yes and failed, or different payload, return error.
    //    - This requires storing idempotency keys and their outcomes.
    const existingTransactionByIdempotency = await transactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTransactionByIdempotency) {
        if (existingTransactionByIdempotency.status === 'COMPLETED' || existingTransactionByIdempotency.status === 'PENDING') { // Or whatever status means "already initiated successfully"
             // Check if payload matches (amount, currency for this user)
            if (parseFloat(existingTransactionByIdempotency.amount) === depositData.amount &&
                existingTransactionByIdempotency.metadata && // Assuming metadata stores original request for comparison
                existingTransactionByIdempotency.metadata.originalCurrency === depositData.currency &&
                existingTransactionByIdempotency.walletId === (await walletRepository.findByUserId(userId))?.id // Check if it belongs to the user's wallet
                ) {
                // Return previous successful-like response (or current status)
                // This is simplified; a real payment gateway URL might not be re-issuable.
                // The response should reflect the current state of that idempotent request.
                return new ApiResponse(res, httpStatusCodes.OK, 'Deposit already initiated (idempotency).', {
                    message: `Deposit for ${depositData.amount} ${depositData.currency} was already processed or is pending.`,
                    paymentGatewayUrl: `https://payment.gateway.com/pay/existing_tx_${existingTransactionByIdempotency.id}`,
                    transactionId: existingTransactionByIdempotency.id,
                    status: existingTransactionByIdempotency.status,
                }).send();
            } else {
                 throw new ApiError(httpStatusCodes.CONFLICT, `Idempotency key ${idempotencyKey} already used with a different request.`);
            }
        }
        // If it was FAILED, allow retry with same key, or require new key. Policy decision.
    }


    // 2. Get user's wallet
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    }

    // 3. Create a PENDING transaction record
    const transactionId = uuidv4();
    const pendingTransaction = {
      id: transactionId,
      walletId: wallet.id,
      type: 'DEPOSIT',
      amount: depositData.amount,
      status: 'PENDING',
      idempotencyKey: idempotencyKey,
      description: `Wallet deposit initialization for ${depositData.amount} ${depositData.currency}.`,
      metadata: {
          userId, // Store initiating user for audit
          originalAmount: depositData.amount,
          originalCurrency: depositData.currency,
          // any other info relevant for payment gateway interaction
      },
      transactionDate: new Date(),
    };
    await transactionRepository.create(pendingTransaction);

    // 4. Prepare data for/redirect to payment gateway
    const paymentGatewayUrl = `https://payment.gateway.com/pay/new_tx_${transactionId}?amount=${depositData.amount}&currency=${depositData.currency}`;
    const result = {
      message: 'Deposit initialized. Proceed to payment gateway.',
      paymentGatewayUrl,
      transactionId,
    };
    // --- End Placeholder Logic ---

    return new ApiResponse(res, httpStatusCodes.OK, result.message, result).send();
  } catch (error) {
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

    // const getHistory = new GetTransactionHistoryUseCase(transactionRepository);
    // const { transactions, total } = await getHistory.execute(wallet.id, queryParams);
    // Direct repository usage:
    const result = await transactionRepository.findAllByWalletId(wallet.id, queryParams);


    return new ApiResponse(res, httpStatusCodes.OK, 'Transaction history retrieved.', {
        transactions: result.transactions, // Assuming repo returns domain entities
        totalItems: result.total,
        currentPage: result.page,
        pageSize: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
    }).send();
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
    if (!idempotencyKey) { // Make idempotency key optional or required based on policy for withdrawals
        // For withdrawals, it's also a good idea to prevent duplicates.
        // throw new ApiError(httpStatusCodes.BAD_REQUEST, `Header ${appConfig.idempotencyKeyHeader} is required.`);
    }


    const { error, value: withdrawalData } = requestWithdrawalSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;

    // const requestWithdrawal = new RequestWithdrawalUseCase(walletRepository, transactionRepository);
    // const result = await requestWithdrawal.execute(userId, withdrawalData, idempotencyKey);

    // --- Placeholder Logic ---
    // 1. Check idempotency if key provided.
    if (idempotencyKey) {
        const existingTx = await transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (existingTx) {
            // Simplified: if exists, assume it's a duplicate. Real check involves payload matching.
            return new ApiResponse(res, httpStatusCodes.OK, 'Withdrawal request already submitted (idempotency).', {
                transactionId: existingTx.id,
                status: existingTx.status,
            }).send();
        }
    }

    // 2. Get user's wallet and check balance.
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    if (wallet.balance < withdrawalData.amount) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Insufficient balance for withdrawal.');
    }
    // Potentially place a hold on the funds here (e.g. by creating a PENDING_HOLD transaction or similar)

    // 3. Create a 'REQUIRES_APPROVAL' transaction record.
    const transactionId = uuidv4();
    const pendingWithdrawal = {
      id: transactionId,
      walletId: wallet.id,
      type: 'WITHDRAWAL',
      amount: withdrawalData.amount,
      status: 'REQUIRES_APPROVAL',
      idempotencyKey: idempotencyKey || null, // Store if provided
      description: `Withdrawal request for ${withdrawalData.amount} ${withdrawalData.currency}.`,
      metadata: {
          userId,
          withdrawalMethod: withdrawalData.withdrawalMethodDetails,
          // any other relevant info
      },
      transactionDate: new Date(),
    };
    await transactionRepository.create(pendingWithdrawal);

    const result = {
      message: 'Withdrawal request submitted for approval.',
      transactionId,
    };
    // --- End Placeholder Logic ---

    return new ApiResponse(res, httpStatusCodes.ACCEPTED, result.message, result).send(); // 202 Accepted
  } catch (error) {
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
