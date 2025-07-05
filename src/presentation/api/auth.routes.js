const express = require('express');
const Joi = require('joi');
const LoginUseCase = require('../../application/use-cases/auth/login.usecase');
const RegisterUserUseCase = require('../../application/use-cases/auth/register-user.usecase');
const RefreshTokenUseCase = require('../../application/use-cases/auth/refresh-token.usecase');
const SendVerificationEmailUseCase = require('../../application/use-cases/auth/send-verification-email.usecase');
const VerifyEmailUseCase = require('../../application/use-cases/auth/verify-email.usecase');
const PostgresUserRepository = require('../../infrastructure/database/repositories/postgres.user.repository');
const PostgresWalletRepository = require('../../infrastructure/database/repositories/postgres.wallet.repository');
const ConsoleEmailService = require('../../infrastructure/email/console.email.service'); // Using ConsoleEmailService for now
const { appConfig } = require('../../../config/config');
const ms = require('ms'); // Added ms library
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const authMiddleware = require('../../middleware/auth.middleware').authenticateToken; // Import the middleware

const router = express.Router();

// Instantiate repositories
const userRepository = new PostgresUserRepository();
const walletRepository = new PostgresWalletRepository(); // Instantiate wallet repository

// Instantiate use cases
const loginUseCase = new LoginUseCase(userRepository);
const emailService = new ConsoleEmailService(); // Instantiate EmailService
const registerUserUseCase = new RegisterUserUseCase(userRepository, walletRepository, emailService); // Pass emailService if RegisterUseCase uses it
const refreshTokenUseCase = new RefreshTokenUseCase(userRepository);
const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(userRepository, emailService);
const verifyEmailUseCase = new VerifyEmailUseCase(userRepository);


// --- Input Validation Schemas ---
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(), // Add more password complexity rules if needed
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const requestVerificationEmailSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required().description('The verification token received by email.'),
});


// --- Route Handlers ---

/**
 * POST /api/v1/auth/register
 * Register a new user.
 */
router.post('/register', async (req, res, next) => {
  try {
    // 1. Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ApiError(
        httpStatusCodes.BAD_REQUEST,
        'Validation Error',
        error.details.map((d) => d.message)
      );
    }

    // 2. Execute use case
    const { user: createdUser, message } = await registerUserUseCase.execute(value);

    // 3. Send response (Tokens are not sent on register; user must log in)
    // Or, some systems might auto-login user after registration and return tokens.
    // The blueprint implies separate login for tokens.
    return new ApiResponse(
      res,
      httpStatusCodes.CREATED,
      message || 'User registered successfully. Please log in.',
      { user: createdUser } // Return public profile of the created user
    ).send();

  } catch (err) {
    // Errors from use case (ApiError) or other unexpected errors
    next(err); // Pass to the centralized error handler
  }
});


/**
 * POST /api/v1/auth/login
 * Log in and receive Access and Refresh Tokens.
 */
router.post('/login', async (req, res, next) => {
  try {
    // 1. Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ApiError(
        httpStatusCodes.BAD_REQUEST,
        'Validation Error',
        error.details.map((d) => d.message)
      );
    }

    // 2. Execute use case
    const { user, accessToken, refreshToken } = await loginUseCase.execute(value.email, value.password);

    // 3. Set Refresh Token in HttpOnly cookie
    res.cookie(appConfig.jwt.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: appConfig.env === 'production', // Only send over HTTPS in production
      sameSite: 'strict', // Or 'lax' depending on needs. 'strict' is more secure.
      maxAge: appConfig.jwt.refreshExpiration ?
              require('ms')(appConfig.jwt.refreshExpiration) : // Convert string like '7d' to ms
              7 * 24 * 60 * 60 * 1000, // Default 7 days in ms if ms lib fails or not configured
      path: '/api/v1/auth', // Scope cookie to auth paths (refresh, logout)
    });

    // 4. Send response with Access Token in body
    return new ApiResponse(
      res,
      httpStatusCodes.OK,
      'Login successful',
      { user, accessToken }
    ).send();

  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/v1/auth/refresh
 * Get a new Access Token using a Refresh Token (sent via HttpOnly cookie).
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshTokenFromCookie = req.cookies ? req.cookies[appConfig.jwt.refreshCookieName] : null;

    if (!refreshTokenFromCookie) {
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token not found.');
    }

    // Execute the RefreshTokenUseCase
    const result = await refreshTokenUseCase.execute(refreshTokenFromCookie);
    const { accessToken, newRefreshToken } = result; // Destructure, newRefreshToken might be undefined if not rotated

    // If refresh token rotation is implemented and a new refresh token is returned by the use case:
    if (newRefreshToken) {
      res.cookie(appConfig.jwt.refreshCookieName, newRefreshToken, {
        httpOnly: true,
        secure: appConfig.env === 'production',
        sameSite: 'strict',
        maxAge: ms(appConfig.jwt.refreshExpiration || '7d'),
        path: '/api/v1/auth',
      });
    }

    return new ApiResponse(
        res,
        httpStatusCodes.OK,
        'Access token refreshed successfully',
        { accessToken }
    ).send();

  } catch (err) {
    // Clear cookie if refresh token is deemed invalid by the use case (e.g., ApiError with 401)
    // Also handles JWT verification errors if thrown by the use case for an invalid token structure/signature.
    if (err instanceof ApiError && err.statusCode === httpStatusCodes.UNAUTHORIZED ||
        err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.clearCookie(appConfig.jwt.refreshCookieName, {
        httpOnly: true,
        secure: appConfig.env === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });
    }
    next(err); // Pass to centralized error handler
  }
});


/**
 * POST /api/v1/auth/logout
 * Invalidate the Refresh Token for a secure logout.
 * Requires Bearer token authentication to identify the user.
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.sub; // User ID from the authenticated access token (payload.sub)

    // Invalidate the refresh token in the database
    // (e.g., set user.refreshToken to null or a random value)
    await userRepository.update(userId, { refreshToken: null });

    // Clear the refresh token cookie
    res.clearCookie(appConfig.jwt.refreshCookieName, {
      httpOnly: true,
      secure: appConfig.env === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth', // Must match path used when setting cookie
    });

    return new ApiResponse(res, httpStatusCodes.OK, 'Logout successful').send();

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/request-verification-email
 * Request a new email verification link.
 * User must be authenticated.
 */
router.post('/request-verification-email', authMiddleware, async (req, res, next) => {
  try {
    // The user's email is taken from their authenticated session (req.user.email)
    // Or, if allowing them to specify, validate it:
    // const { error, value } = requestVerificationEmailSchema.validate(req.body);
    // if (error) throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    // const userEmailToVerify = value.email;
    // Ensure req.user.email matches userEmailToVerify if POST body is used for email.
    // For simplicity, using authenticated user's email.

    if (!req.user || !req.user.email) {
        throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'User not authenticated or email not found in token.');
    }

    const result = await sendVerificationEmailUseCase.execute(req.user.email);
    return new ApiResponse(res, httpStatusCodes.OK, result.message).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/verify-email
 * Verify user's email using a token.
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { error, value } = verifyEmailSchema.validate(req.body);
    if (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Validation Error', error.details.map(d => d.message));
    }

    const result = await verifyEmailUseCase.execute(value.token);
    // Optionally, log in the user here and return tokens if desired after successful verification.
    return new ApiResponse(res, httpStatusCodes.OK, result.message, { userId: result.userId }).send();
  } catch (error) {
    next(error);
  }
});


module.exports = router;

// Notes:
// - The `registerUserUseCase` constructor was updated to accept `emailService`.
//   Ensure it's used there if automatic verification email on register is desired.
//   Currently, `send-verification-email.usecase.js` is separate.
// - `request-verification-email` route requires authentication, as user requests for their own account.
// - `verify-email` route is public (token itself is the secret).
// - The `ConsoleEmailService` is used here. In production, a real email service implementation
//   (e.g., for SES, SendGrid) would be injected.
// - Error handling in these new routes passes errors to the centralized handler.
// - Joi schemas are added for the new routes' request bodies.
