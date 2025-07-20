const { Router } = require('express');
const { authenticateToken } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const {
  initializeDepositSchema,
  getTransactionHistorySchema,
  requestWithdrawalSchema,
} = require('../validators/wallet.validator');

module.exports = ({ walletController }) => {
    const router = Router();

    // --- Routes ---

    // Get wallet details for the authenticated user
    router.get('/', authenticateToken, walletController.getWalletDetails);
    /*  #swagger.tags = ['Wallet']
        #swagger.summary = "Get user's wallet details"
        #swagger.description = "Retrieves the wallet details for the currently authenticated user."
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.responses[200] = {
            description: 'Wallet details retrieved successfully.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/WalletDetailsResponse" } } }
        }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    */

    // Initialize a deposit transaction
    router.post('/deposit/initialize', authenticateToken, validate(initializeDepositSchema), walletController.initializeDeposit);
    /*  #swagger.tags = ['Wallet']
        #swagger.summary = 'Initialize a deposit'
        #swagger.description = 'Initializes a deposit transaction and returns a payment gateway URL to complete the payment. Requires an idempotency key.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['X-Idempotency-Key'] = { $ref: '#/components/parameters/IdempotencyKeyHeader' }
        #swagger.requestBody = {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/InitializeDepositRequest" } } }
        }
        #swagger.responses[200] = {
            description: 'Deposit initialized successfully or idempotent replay.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/InitializeDepositResponse" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[409] = { description: 'Idempotency key conflict.', schema: { $ref: '#/components/schemas/ErrorResponse' } }
    */

    // Get transaction history for the authenticated user
    router.get('/history', authenticateToken, validate(getTransactionHistorySchema), walletController.getTransactionHistory);
    /*  #swagger.tags = ['Wallet']
        #swagger.summary = "Get user's transaction history"
        #swagger.description = "Retrieves a paginated list of transactions for the authenticated user's wallet."
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['page'] = { $ref: '#/components/parameters/PageParam' }
        #swagger.parameters['limit'] = { $ref: '#/components/parameters/LimitParam' }
        #swagger.parameters['type'] = { in: 'query', schema: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_FEE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT'] }, description: 'Filter by transaction type.' }
        #swagger.parameters['status'] = { in: 'query', schema: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELED', 'REQUIRES_APPROVAL', 'PROCESSING', 'REFUNDED'] }, description: 'Filter by transaction status.' }
        #swagger.parameters['sortBy'] = { in: 'query', schema: { type: 'string', enum: ['transactionDate', 'amount'] }, description: 'Field to sort by.' }
        #swagger.parameters['sortOrder'] = { in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] }, description: 'Sort order.' }
        #swagger.responses[200] = {
            description: 'A list of transactions.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedTransactionHistoryResponse" } } }
        }
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    */

    // Request a withdrawal from the wallet
    router.post('/withdrawals', authenticateToken, validate(requestWithdrawalSchema), walletController.requestWithdrawal);
    /*  #swagger.tags = ['Wallet']
        #swagger.summary = 'Request a withdrawal'
        #swagger.description = 'Submits a withdrawal request from the user\'s wallet. Requires an idempotency key.'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['X-Idempotency-Key'] = { $ref: '#/components/parameters/IdempotencyKeyHeader' }
        #swagger.requestBody = {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalRequest" } } }
        }
        #swagger.responses[202] = {
            description: 'Withdrawal request accepted for processing.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalResponse" } } }
        }
        #swagger.responses[200] = {
            description: 'Idempotent replay of a previous request.',
            content: { "application/json": { schema: { $ref: "#/components/schemas/RequestWithdrawalResponse" } } }
        }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' } // e.g., insufficient funds
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[409] = { description: 'Idempotency key conflict.', schema: { $ref: '#/components/schemas/ErrorResponse' } }
        #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' } // e.g., insufficient funds
        #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
        #swagger.responses[409] = { description: 'Idempotency key conflict.', schema: { $ref: '#/components/schemas/ErrorResponse' } }
    */

    // Note: The payment gateway callback is not included in the user-facing API documentation
    // as it's called by an external service. It would be documented separately for the gateway provider.

    return router;
};
