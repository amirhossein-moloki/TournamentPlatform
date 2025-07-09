const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const httpStatusCodes = require('http-status-codes');
const { appConfig } = require('../../config/config'); // To get cookie names etc.
const ms = require('ms');

// Import the router
const authRoutes = require('../../src/presentation/api/auth.routes');

// Mock Use Cases - Declare with let, initialize in beforeEach
let mockRegisterUserUseCaseExecuteFn;
let mockLoginUseCaseExecuteFn;
let mockRefreshTokenUseCaseExecuteFn;
let mockSendVerificationEmailUseCaseExecuteFn;
let mockVerifyEmailUseCaseExecuteFn;

// Mock for UserRepository instance methods, to be initialized in beforeEach
let mockUserRepoUpdateFn;

jest.mock('../../src/application/use-cases/auth/register-user.usecase', () => {
  return jest.fn().mockImplementation(() => ({
    execute: (...args) => mockRegisterUserUseCaseExecuteFn(...args),
  }));
});
jest.mock('../../src/application/use-cases/auth/login.usecase', () => {
  return jest.fn().mockImplementation(() => ({
    execute: (...args) => mockLoginUseCaseExecuteFn(...args),
  }));
});
jest.mock('../../src/application/use-cases/auth/refresh-token.usecase', () => {
  return jest.fn().mockImplementation(() => ({
    execute: (...args) => mockRefreshTokenUseCaseExecuteFn(...args),
  }));
});
jest.mock('../../src/application/use-cases/auth/send-verification-email.usecase', () => {
    return jest.fn().mockImplementation(() => ({
      execute: (...args) => mockSendVerificationEmailUseCaseExecuteFn(...args),
    }));
  });
jest.mock('../../src/application/use-cases/auth/verify-email.usecase', () => {
    return jest.fn().mockImplementation(() => ({
      execute: (...args) => mockVerifyEmailUseCaseExecuteFn(...args),
    }));
});

// Mock UserRepository for logout, as it's directly used in the route
jest.mock('../../src/infrastructure/database/repositories/postgres.user.repository', () => {
    return {
        PostgresUserRepository: jest.fn().mockImplementation(() => {
            // This is the constructor of the mocked repository.
            // It returns an object simulating an instance of PostgresUserRepository.
            // The methods of this instance will call the mock functions defined in the test scope (e.g., in beforeEach).
            return {
                update: (userId, data) => mockUserRepoUpdateFn(userId, data),
                // findByEmail: (email) => mockUserRepoFindByEmailFn(email), // Example for other methods
                // Add other methods as needed by the routes being tested
            };
        })
    };
});

// Declare mockAuthMiddleware with let so it can be reassigned in beforeEach
let mockAuthMiddleware;

jest.mock('../../src/middleware/auth.middleware', () => ({
    // The factory function will use the `mockAuthMiddleware` variable from the outer scope.
    // Its value will be set in `beforeEach`.
    authenticateToken: (req, res, next) => mockAuthMiddleware(req, res, next),
}));


// Centralized error handler mock (important for testing error responses)
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
    stack: process.env.NODE_ENV === 'test_dev' ? err.stack : undefined, // Show stack in a specific test_dev env
  });
};

const app = express();
app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware to handle req.cookies
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler); // Add the centralized error handler

describe('Auth Routes Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Initialize/re-initialize mock functions before each test
    mockAuthMiddleware = jest.fn((req, res, next) => {
        req.user = { sub: 'test-user-id', email: 'test@example.com', version: 0 };
        next();
    });
    mockUserRepoUpdateFn = jest.fn(); // Initialize the actual mock function for user repo update

    // Initialize use case execute mocks
    mockRegisterUserUseCaseExecuteFn = jest.fn();
    mockLoginUseCaseExecuteFn = jest.fn();
    mockRefreshTokenUseCaseExecuteFn = jest.fn();
    mockSendVerificationEmailUseCaseExecuteFn = jest.fn();
    mockVerifyEmailUseCaseExecuteFn = jest.fn();
  });

  describe('POST /api/v1/auth/register', () => {
    const registerPayload = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a user and return user data, access token, and set refresh token cookie', async () => {
      const mockUser = { id: 'user-123', username: registerPayload.username, email: registerPayload.email, role: 'User' };
      const mockTokens = { accessToken: 'fakeAccessToken', refreshToken: 'fakeRefreshToken' };
      mockRegisterUserUseCaseExecuteFn.mockResolvedValue({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        message: 'User registered successfully.'
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerPayload);

      expect(response.status).toBe(httpStatusCodes.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(mockRegisterUserUseCaseExecuteFn).toHaveBeenCalledWith(registerPayload);

      // Check cookie
      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=${mockTokens.refreshToken}`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/v1/auth');
      // expect(cookie).toContain('SameSite=Strict'); // Default SameSite might vary by supertest/express version
    });

    it('should return 400 Bad Request for invalid registration payload', async () => {
      const invalidPayload = { email: 'not-an-email', password: 'short' };
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidPayload);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle errors from RegisterUserUseCase', async () => {
        mockRegisterUserUseCaseExecuteFn.mockRejectedValue(new Error('Registration failed'));
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(registerPayload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR); // Default error
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Registration failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should log in a user and return user data, access token, and set refresh token cookie', async () => {
      const mockUser = { id: 'user-123', email: loginPayload.email, role: 'User' };
      const mockTokens = { accessToken: 'fakeAccessTokenLogin', refreshToken: 'fakeRefreshTokenLogin' };
      mockLoginUseCaseExecuteFn.mockResolvedValue({ user: mockUser, ...mockTokens });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginPayload);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(mockLoginUseCaseExecuteFn).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=${mockTokens.refreshToken}`);
      expect(cookie).toContain('HttpOnly');
    });

    it('should return 400 Bad Request for invalid login payload', async () => {
        const invalidPayload = { email: 'not-an-email' }; // Missing password
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(invalidPayload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
    });

    it('should handle errors from LoginUseCase (e.g., invalid credentials)', async () => {
        const ApiError = require('../../src/utils/ApiError'); // Local require for this test
        mockLoginUseCaseExecuteFn.mockRejectedValue(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid credentials'));
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginPayload);

        expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return a new access token and set new refresh token cookie if rotation is enabled', async () => {
      const oldRefreshToken = 'oldFakeRefreshToken';
      const newAccessToken = 'newFakeAccessToken';
      const newRotatedRefreshToken = 'newRotatedRefreshToken'; // Simulate rotation

      mockRefreshTokenUseCaseExecuteFn.mockResolvedValue({
        accessToken: newAccessToken,
        newRefreshToken: newRotatedRefreshToken // Assume rotation gives a new one
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${appConfig.jwt.refreshCookieName}=${oldRefreshToken}`);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(newAccessToken);
      expect(mockRefreshTokenUseCaseExecuteFn).toHaveBeenCalledWith(oldRefreshToken);

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=${newRotatedRefreshToken}`);
      expect(cookie).toContain('HttpOnly');
    });

    it('should return a new access token without setting cookie if rotation is not enabled or no new token', async () => {
        const oldRefreshToken = 'oldFakeRefreshToken';
        const newAccessToken = 'newFakeAccessToken';
        // Use case does not return newRefreshToken
        mockRefreshTokenUseCaseExecuteFn.mockResolvedValue({ accessToken: newAccessToken });

        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', `${appConfig.jwt.refreshCookieName}=${oldRefreshToken}`);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body.data.accessToken).toBe(newAccessToken);
        expect(mockRefreshTokenUseCaseExecuteFn).toHaveBeenCalledWith(oldRefreshToken);
        // Expect no set-cookie header if token isn't rotated
        expect(response.headers['set-cookie']).toBeUndefined();
      });

    it('should return 401 Unauthorized if refresh token is missing', async () => {
      const response = await request(app).post('/api/v1/auth/refresh'); // No cookie
      expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe('Refresh token not found.');
    });

    it('should return 401 Unauthorized and clear cookie if RefreshTokenUseCase throws ApiError 401', async () => {
      const ApiError = require('../../src/utils/ApiError');
      mockRefreshTokenUseCaseExecuteFn.mockRejectedValue(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token'));

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${appConfig.jwt.refreshCookieName}=invalidOrExpiredToken`);

      expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe('Invalid or expired refresh token');
      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=;`); // Cleared cookie
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should log out the user, clear refresh token cookie, and call userRepo.update', async () => {
      mockUserRepoUpdateFn.mockResolvedValue({ success: true }); // Simulate successful update

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer fakeAccessToken'); // authMiddleware will use req.user from mock

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
      expect(mockUserRepoUpdateFn).toHaveBeenCalledWith('test-user-id', { refreshToken: null });

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=;`);
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('should return 401 if authMiddleware fails (no token)', async () => {
        mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
            const ApiError = require('../../src/utils/ApiError');
            next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'No token provided.'));
        });
        const response = await request(app).post('/api/v1/auth/logout');
        expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/auth/request-verification-email', () => {
    it('should send a verification email successfully', async () => {
        mockSendVerificationEmailUseCaseExecuteFn.mockResolvedValue({ message: 'Verification email sent.' });
        const response = await request(app)
            .post('/api/v1/auth/request-verification-email')
            .set('Authorization', 'Bearer fakeAccessToken'); // authMiddleware provides req.user

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Verification email sent.');
        expect(mockSendVerificationEmailUseCaseExecuteFn).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 401 if user is not authenticated', async () => {
        mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
            // Simulate auth failure specifically for this test
            req.user = null; // Or simply don't call next() or throw error
            const ApiError = require('../../src/utils/ApiError');
            next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'User not authenticated or email not found in token.'));
        });

        const response = await request(app)
            .post('/api/v1/auth/request-verification-email');
            // No Authorization header sent

        expect(response.status).toBe(httpStatusCodes.UNAUTHORIZED);
        expect(response.body.message).toContain('User not authenticated');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    const verificationToken = 'valid-verification-token';
    it('should verify email successfully', async () => {
        const userId = 'verified-user-id';
        mockVerifyEmailUseCaseExecuteFn.mockResolvedValue({ message: 'Email verified successfully.', userId });
        const response = await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ token: verificationToken });

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Email verified successfully.');
        expect(response.body.data.userId).toBe(userId);
        expect(mockVerifyEmailUseCaseExecuteFn).toHaveBeenCalledWith(verificationToken);
    });

    it('should return 400 for missing token', async () => {
        const response = await request(app)
            .post('/api/v1/auth/verify-email')
            .send({});
        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.errors[0]).toContain('"token" is required');
    });

    it('should handle errors from VerifyEmailUseCase', async () => {
        const ApiError = require('../../src/utils/ApiError');
        mockVerifyEmailUseCaseExecuteFn.mockRejectedValue(new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid or expired token.'));
        const response = await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ token: 'invalid-token' });

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.message).toBe('Invalid or expired token.');
    });
  });
});
