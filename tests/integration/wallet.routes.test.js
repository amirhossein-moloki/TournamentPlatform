const request = require('supertest'); // Placeholder for actual supertest
const express = require('express');
const walletRoutes = require('../../../src/presentation/api/wallet.routes');
const { authenticateToken } = require('../../../src/middleware/auth.middleware'); // Actual middleware
const ApiError = require('../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

// Mock middleware and use cases
jest.mock('../../src/middleware/auth.middleware', () => ({ // Corrected path
  authenticateToken: jest.fn((req, res, next) => {
    // Simulate successful authentication for most tests
    req.user = { sub: 'test-user-id', email: 'test@example.com' };
    next();
  }),
}));

const mockGetWalletDetailsUseCase = { execute: jest.fn() };
const mockInitializeDepositUseCase = { execute: jest.fn() };
const mockRequestWithdrawalUseCase = { execute: jest.fn() };
const mockGetTransactionHistoryUseCase = { execute: jest.fn() }; // Added for completeness

jest.mock('../../src/application/use-cases/wallet/get-wallet-details.usecase', () => jest.fn(() => mockGetWalletDetailsUseCase)); // Corrected path
jest.mock('../../src/application/use-cases/wallet/initialize-deposit.usecase', () => jest.fn(() => mockInitializeDepositUseCase)); // Corrected path
jest.mock('../../src/application/use-cases/wallet/request-withdrawal.usecase', () => jest.fn(() => mockRequestWithdrawalUseCase)); // Corrected path
jest.mock('../../src/application/use-cases/wallet/get-transaction-history.usecase', () => jest.fn(() => mockGetTransactionHistoryUseCase)); // Corrected path


// Centralized error handler mock (important for testing error responses)
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    statusCode,
    message: err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Optional stack trace
  });
};

const app = express();
app.use(express.json());
// Mount wallet routes under /api/v1/wallet to match actual routing structure if applicable
app.use('/api/v1/wallet', walletRoutes); // Use the actual walletRoutes
app.use(errorHandler); // Add the centralized error handler

describe('Wallet Routes Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock for authenticateToken to pass
    authenticateToken.mockImplementation((req, res, next) => {
        req.user = { sub: 'test-user-id', email: 'test@example.com' };
        next();
    });
  });

  describe('GET /api/v1/wallet (Get Wallet Details)', () => {
    it('should return 200 OK with wallet details for authenticated user', async () => {
      const mockWallet = { id: 'wallet-1', balance: 100, currency: 'USD' };
      mockGetWalletDetailsUseCase.execute.mockResolvedValue(mockWallet);

      const response = await request(app).get('/api/v1/wallet');

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWallet);
      expect(mockGetWalletDetailsUseCase.execute).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        // Simulate authentication failure by not calling next() or throwing error
         next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'No token provided or token is invalid.'));
      });
      const response = await request(app).get('/api/v1/wallet');
      expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe('No token provided or token is invalid.');
    });

    it('should return 404 Not Found if wallet does not exist', async () => {
      mockGetWalletDetailsUseCase.execute.mockRejectedValue(new ApiError(httpStatusCodes.NOT_FOUND, 'Wallet not found'));
      const response = await request(app).get('/api/v1/wallet');
      expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
      expect(response.body.message).toBe('Wallet not found');
    });
  });

  describe('POST /api/v1/wallet/deposit/initialize', () => {
    const depositPayload = { amount: 50, currency: 'USD' };
    const idempotencyKey = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

    it('should return 200 OK on successful deposit initialization', async () => {
      const mockResponse = { message: 'Deposit initialized', paymentGatewayUrl: 'http://pay.co', transactionId: 'tx-1' };
      mockInitializeDepositUseCase.execute.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/wallet/deposit/initialize')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(depositPayload);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.data).toEqual(expect.objectContaining({ transactionId: 'tx-1' }));
      expect(mockInitializeDepositUseCase.execute).toHaveBeenCalledWith('test-user-id', depositPayload.amount, depositPayload.currency, idempotencyKey);
    });

    it('should return 400 Bad Request if X-Idempotency-Key header is missing', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/deposit/initialize')
        .send(depositPayload);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body.message).toContain('X-Idempotency-Key is required');
    });

    it('should return 400 Bad Request if X-Idempotency-Key header is not a UUID', async () => {
        const response = await request(app)
          .post('/api/v1/wallet/deposit/initialize')
          .set('X-Idempotency-Key', 'not-a-uuid')
          .send(depositPayload);
        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.message).toContain('X-Idempotency-Key must be a valid UUID');
    });

    it('should return 400 Bad Request for invalid payload', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/deposit/initialize')
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ amount: -10, currency: 'USD' }); // Invalid amount
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body.errors[0]).toContain('Amount must be positive');
    });
  });

  describe('POST /api/v1/wallet/withdrawals', () => {
    const withdrawalPayload = { amount: 50, currency: 'USD', withdrawalMethodDetails: { type: 'PAYPAL', email: 'test@paypal.com' } };
    const idempotencyKey = 'b2c3d4e5-f6a7-8901-2345-678901bcdef0';

    it('should return 202 Accepted for a new successful withdrawal request', async () => {
      const mockTransaction = { id: 'tx-withdraw-1', status: 'REQUIRES_APPROVAL' };
      mockRequestWithdrawalUseCase.execute.mockResolvedValue({ transaction: mockTransaction, message: 'Withdrawal request submitted.' });

      const response = await request(app)
        .post('/api/v1/wallet/withdrawals')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(withdrawalPayload);

      expect(response.status).toBe(httpStatusCodes.ACCEPTED);
      expect(response.body.data).toEqual({ transactionId: mockTransaction.id, status: mockTransaction.status });
      expect(mockRequestWithdrawalUseCase.execute).toHaveBeenCalledWith('test-user-id', withdrawalPayload, idempotencyKey);
    });

    it('should return 200 OK for an idempotent replay of withdrawal', async () => {
      const mockTransaction = { id: 'tx-withdraw-existing', status: 'REQUIRES_APPROVAL' };
      mockRequestWithdrawalUseCase.execute.mockResolvedValue({ transaction: mockTransaction, message: 'Withdrawal request already submitted or being processed (Idempotency).' });

      const response = await request(app)
        .post('/api/v1/wallet/withdrawals')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(withdrawalPayload);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.data).toEqual({ transactionId: mockTransaction.id, status: mockTransaction.status });
    });

    it('should return 400 Bad Request if X-Idempotency-Key header is missing', async () => {
        const response = await request(app)
          .post('/api/v1/wallet/withdrawals')
          .send(withdrawalPayload);
        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.message).toContain('X-Idempotency-Key is required');
    });

    it('should return 400 Bad Request if X-Idempotency-Key header is not a UUID', async () => {
        const response = await request(app)
          .post('/api/v1/wallet/withdrawals')
          .set('X-Idempotency-Key', 'not-a-uuid-either')
          .send(withdrawalPayload);
        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.message).toContain('X-Idempotency-Key must be a valid UUID');
    });

    it('should return 400 Bad Request for insufficient funds (mocked use case error)', async () => {
      mockRequestWithdrawalUseCase.execute.mockRejectedValue(new ApiError(httpStatusCodes.BAD_REQUEST, 'Insufficient balance'));
      const response = await request(app)
        .post('/api/v1/wallet/withdrawals')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(withdrawalPayload);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe('Insufficient balance');
    });
  });

  // TODO: Add tests for GET /api/v1/wallet/history if time permits
  // - Success case with default pagination/filters
  // - Success case with custom pagination/filters
  // - Invalid filter/pagination parameters (400)
  // - Wallet not found (404)
});
