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

router.get('/', authenticateToken, async (req, res, next) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = "Get the authenticated user's wallet details."
    #swagger.description = "Retrieves the current balance, currency, and other relevant details for the authenticated user's wallet."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Wallet details retrieved successfully.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/WalletDetailsResponse" } } }
    }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'User wallet not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const userId = req.user.sub;
    const walletDetails = await getWalletDetailsUseCase.execute(userId);
    return new ApiResponse(res, httpStatusCodes.OK, 'Wallet details retrieved successfully.', walletDetails).send();
  } catch (error) {
    next(error);
  }
});

router.post('/deposit/initialize', authenticateToken, async (req, res, next) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Initialize a deposit to the wallet.'
    #swagger.description = 'Starts the process for depositing funds into the user’s wallet. Returns a payment gateway URL for the user to complete the transaction. Requires an X-Idempotency-Key header (UUID) to prevent duplicate requests.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['X-Idempotency-Key'] = {
        in: 'header', required: true, description: 'A UUID to ensure idempotency of the request.',
        schema: { type: 'string', format: 'uuid' }
    }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/InitializeDepositRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Deposit initialization successful or idempotent replay successful.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/InitializeDepositResponse" } } }
    }
    #swagger.responses[400] = { description: 'Validation error (e.g., invalid amount, missing idempotency key).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[409] = { description: 'Conflict due to idempotency key (e.g., key used with different payload).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error or payment gateway error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
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

    const { error, value: depositData } = initializeDepositSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;
    const result = await initializeDepositUseCase.execute(userId, depositData.amount, depositData.currency, idempotencyKey);

    return new ApiResponse(res, httpStatusCodes.OK, result.message, {
      paymentGatewayUrl: result.paymentGatewayUrl,
      transactionId: result.transactionId,
      ...(result.status && { status: result.status }),
    }).send();
  } catch (error) {
    next(error);
  }
});

router.get('/history', authenticateToken, async (req, res, next) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = "Get the authenticated user's transaction history."
    #swagger.description = "Retrieves a paginated list of transactions for the authenticated user's wallet. Can be filtered by type, status and sorted."
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['page'] = { in: 'query', description: 'Page number.', schema: { type: 'integer', default: 1 } }
    #swagger.parameters['limit'] = { in: 'query', description: 'Items per page.', schema: { type: 'integer', default: 10 } }
    #swagger.parameters['type'] = { in: 'query', description: 'Filter by transaction type.', schema: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT'] } }
    #swagger.parameters['status'] = { in: 'query', description: 'Filter by transaction status.', schema: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REQUIRES_APPROVAL', 'PROCESSING', 'REFUNDED'] } }
    #swagger.parameters['sortBy'] = { in: 'query', description: 'Field to sort by.', schema: { type: 'string', enum: ['transactionDate', 'amount'], default: 'transactionDate' } }
    #swagger.parameters['sortOrder'] = { in: 'query', description: 'Sort order.', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' } }
    #swagger.responses[200] = {
      description: 'Transaction history retrieved successfully.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTransactionHistoryResponse" } } }
    }
    #swagger.responses[400] = { description: 'Validation error for query parameters.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[404] = { description: 'User wallet not found.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
  try {
    const { error, value: queryParams } = transactionHistorySchema.validate(req.query);
    if (error) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const userId = req.user.sub;
    const wallet = await walletRepository.findByUserId(userId); // This check might be redundant if use case handles it
    if (!wallet) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User wallet not found.');
    }

    const result = await getTransactionHistoryUseCase.execute(userId, queryParams);
    const responseData = {
      page: result.currentPage,
      limit: result.pageSize,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      items: result.transactions.map(t => t.toPlainObject ? t.toPlainObject() : t)
    };
    return new ApiResponse(res, httpStatusCodes.OK, 'Transaction history retrieved.', responseData).send();
  } catch (error) {
    next(error);
  }
});

router.post('/withdrawals', authenticateToken, async (req, res, next) => {
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Request a withdrawal from the wallet.'
    #swagger.description = 'Submits a withdrawal request. This typically goes into a PENDING or REQUIRES_APPROVAL state and is processed by a finance manager. Requires an X-Idempotency-Key header (UUID).'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['X-Idempotency-Key'] = {
        in: 'header', required: true, description: 'A UUID to ensure idempotency of the request.',
        schema: { type: 'string', format: 'uuid' }
    }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalRequest" } } }
    }
    #swagger.responses[200] = {
      description: 'Withdrawal request already processed (idempotent replay of a completed/approved request).',
      content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalResponse" } } }
    }
    #swagger.responses[202] = {
      description: 'Withdrawal request accepted for processing.',
      content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalResponse" } } }
    }
    #swagger.responses[400] = { description: 'Validation error (e.g., insufficient funds, invalid amount, missing idempotency key).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[401] = { description: 'Unauthorized.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[409] = { description: 'Conflict due to idempotency key (e.g., key used with different payload).', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    #swagger.responses[500] = { description: 'Internal server error.', content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
  */
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
    const result = await requestWithdrawalUseCase.execute(userId, withdrawalData, idempotencyKey);

    let statusCode = httpStatusCodes.ACCEPTED; // Default for new requests (202)
    if (result.message && result.message.includes("already submitted or being processed (Idempotency)")) {
        statusCode = httpStatusCodes.OK; // 200 for idempotent replay of an existing request
    }

    return new ApiResponse(
        res,
        statusCode,
        result.message,
        { transactionId: result.transaction.id, status: result.transaction.status, message: result.message }
    ).send();
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
  /*
    #swagger.tags = ['Wallet']
    #swagger.summary = 'Payment gateway callback for deposits (e.g., Zarinpal).'
    #swagger.description = 'This endpoint is called by the payment gateway (e.g., Zarinpal) after a payment attempt. It should not be called directly by clients. It handles payment verification and updates the transaction status. It redirects the user back to the frontend.'
    #swagger.parameters['Authority'] = {
        in: 'query', required: true, description: 'Authority code from Zarinpal.',
        schema: { type: 'string' }
    }
    #swagger.parameters['Status'] = {
        in: 'query', required: true, description: 'Payment status from Zarinpal ("OK" or "NOK").',
        schema: { type: 'string', enum: ['OK', 'NOK'] }
    }
    #swagger.responses[302] = {
        description: 'Redirects the user to a frontend success or failure page. Location header will contain the redirect URL.'
        // No content body for 302, but Location header is key.
    }
    // Other responses are less likely as this endpoint typically only redirects.
    // Errors here should be logged and a generic error redirect should occur.
  */
  try {
    const { error, value: callbackQuery } = zarinpalCallbackSchema.validate(req.query);
    if (error) {
      console.error('Invalid Zarinpal callback query:', error.details);
      return res.redirect(`${appConfig.frontendUrl}/payment/failed?error=invalid_callback_params`);
    }

    const { Authority, Status } = callbackQuery;
    // const clientIp = req.ip; // Zarinpal might not need IP for verification, check their docs.

    // --- Placeholder Logic for verifyZarinpalDepositUseCase.execute(Authority, Status) ---
    let redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}`;
    if (Status === 'OK') {
      const mockTransaction = await transactionRepository.findByGatewayAuthority(Authority);
      if (mockTransaction && mockTransaction.status === 'PENDING') {
        // const zarinpalVerificationSuccess = true; // Simulate external verification
        // if (zarinpalVerificationSuccess) {
        //   await walletRepository.credit(mockTransaction.walletId, mockTransaction.amount, mockTransaction.currency);
        //   await transactionRepository.updateStatus(mockTransaction.id, 'COMPLETED');
        //   console.log(`Simulated Zarinpal payment success for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
        //   redirectUrl = `${appConfig.frontendUrl}/payment/success?transactionId=${mockTransaction.id}&authority=${Authority}`;
        // } else {
        //   await transactionRepository.updateStatus(mockTransaction.id, 'FAILED', { failureReason: 'Zarinpal verification failed' });
        //   console.log(`Simulated Zarinpal payment verification failed for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
        //   redirectUrl = `${appConfig.frontendUrl}/payment/failed?transactionId=${mockTransaction.id}&reason=verification_failed`;
        // }
        // Simplified placeholder for success path
         console.log(`Simulated Zarinpal payment OK for Authority: ${Authority}. Would verify and complete transaction ${mockTransaction.id}`);
         redirectUrl = `${appConfig.frontendUrl}/payment/success?transactionId=${mockTransaction.id}&authority=${Authority}`;
      } else if (mockTransaction && mockTransaction.status === 'COMPLETED') {
        console.log(`Simulated Zarinpal payment already completed for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
        redirectUrl = `${appConfig.frontendUrl}/payment/success?transactionId=${mockTransaction.id}&authority=${Authority}&status=already_completed`;
      } else {
         console.log(`Simulated Zarinpal callback (OK) - Transaction not found or not PENDING for Authority: ${Authority}`);
        redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}&reason=tx_not_found_or_invalid_state_ok`;
      }
    } else { // Status === 'NOK'
        const mockTransaction = await transactionRepository.findByGatewayAuthority(Authority);
        if (mockTransaction && mockTransaction.status === 'PENDING') {
            // await transactionRepository.updateStatus(mockTransaction.id, 'CANCELED', { failureReason: 'Payment canceled by user or Zarinpal (NOK)' });
            console.log(`Simulated Zarinpal payment NOK (canceled/failed) for Authority: ${Authority}. Transaction ID: ${mockTransaction.id}`);
            redirectUrl = `${appConfig.frontendUrl}/payment/failed?transactionId=${mockTransaction.id}&reason=payment_nok`;
        } else {
            console.log(`Simulated Zarinpal payment NOK for Authority: ${Authority}. Transaction not found or not PENDING.`);
            redirectUrl = `${appConfig.frontendUrl}/payment/failed?authority=${Authority}&reason=payment_nok_tx_not_found_or_invalid_state`;
        }
    }
    // --- End Placeholder Logic ---
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in Zarinpal callback:', error);
    res.redirect(`${appConfig.frontendUrl}/payment/error?code=internal_error`);
  }
});
