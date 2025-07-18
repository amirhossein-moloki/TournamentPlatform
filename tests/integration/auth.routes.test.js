const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const httpStatusCodes = require('http-status-codes');
const { appConfig } = require('../../config/config');
const ms = require('ms');

const authRoutes = require('../../src/presentation/api/auth.routes');

let mockRegisterUserUseCaseExecuteFn;
let mockLoginUseCaseExecuteFn;
let mockRefreshTokenUseCaseExecuteFn;
let mockSendVerificationEmailUseCaseExecuteFn;
let mockVerifyEmailUseCaseExecuteFn;
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

jest.mock('../../src/infrastructure/database/repositories/postgres.user.repository', () => {
    return {
        PostgresUserRepository: jest.fn().mockImplementation(() => {
            return {
                update: (userId, data) => mockUserRepoUpdateFn(userId, data),
            };
        })
    };
});

let mockAuthMiddleware;

jest.mock('../../src/middleware/auth.middleware', () => ({
    authenticateToken: jest.fn((req, res, next) => mockAuthMiddleware(req, res, next)),
}));

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
    stack: process.env.NODE_ENV === 'test_dev' ? err.stack : undefined,
  });
};

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

describe('Auth Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthMiddleware = jest.fn((req, res, next) => {
        req.user = { sub: 'test-user-id', email: 'test@example.com', version: 0 };
        next();
    });
    mockUserRepoUpdateFn = jest.fn();

    mockRegisterUserUseCaseExecuteFn = jest.fn();
    mockLoginUseCaseExecuteFn = jest.fn();
    mockRefreshTokenUseCaseExecuteFn = jest.fn();
    mockSendVerificationEmailUseCaseExecuteFn = jest.fn();
    mockVerifyEmailUseCaseExecuteFn = jest.fn();
  });

  afterAll(async () => {
    await sequelize.close();
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

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=${mockTokens.refreshToken}`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/v1/auth');
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

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
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
        const invalidPayload = { email: 'not-an-email' };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(invalidPayload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
    });

    it('should handle errors from LoginUseCase (e.g., invalid credentials)', async () => {
        const ApiError = require('../../src/utils/ApiError');
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
      const newRotatedRefreshToken = 'newRotatedRefreshToken';

      mockRefreshTokenUseCaseExecuteFn.mockResolvedValue({
        accessToken: newAccessToken,
        newRefreshToken: newRotatedRefreshToken
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
        mockRefreshTokenUseCaseExecuteFn.mockResolvedValue({ accessToken: newAccessToken });

        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', `${appConfig.jwt.refreshCookieName}=${oldRefreshToken}`);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body.data.accessToken).toBe(newAccessToken);
        expect(mockRefreshTokenUseCaseExecuteFn).toHaveBeenCalledWith(oldRefreshToken);
        expect(response.headers['set-cookie']).toBeUndefined();
      });

    it('should return 401 Unauthorized if refresh token is missing', async () => {
      const response = await request(app).post('/api/v1/auth/refresh');
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
      expect(cookie).toContain(`${appConfig.jwt.refreshCookieName}=;`);
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should log out the user, clear refresh token cookie, and call userRepo.update', async () => {
      mockUserRepoUpdateFn.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer fakeAccessToken');

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
            .set('Authorization', 'Bearer fakeAccessToken');

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Verification email sent.');
        expect(mockSendVerificationEmailUseCaseExecuteFn).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 401 if user is not authenticated', async () => {
        mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.user = null;
            const ApiError = require('../../src/utils/ApiError');
            next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'User not authenticated or email not found in token.'));
        });

        const response = await request(app)
            .post('/api/v1/auth/request-verification-email');

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
