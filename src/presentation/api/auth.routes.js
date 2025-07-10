const express = require('express');
const Joi = require('joi');
const LoginUseCase = require('../../application/use-cases/auth/login.usecase');
const RegisterUserUseCase = require('../../application/use-cases/auth/register-user.usecase');
const RefreshTokenUseCase = require('../../application/use-cases/auth/refresh-token.usecase');
const SendVerificationEmailUseCase = require('../../application/use-cases/auth/send-verification-email.usecase');
const VerifyEmailUseCase = require('../../application/use-cases/auth/verify-email.usecase');

// Import database models
const db = require('../../infrastructure/database/models');

const { PostgresUserRepository } = require('../../infrastructure/database/repositories/postgres.user.repository');
const { PostgresWalletRepository } = require('../../infrastructure/database/repositories/postgres.wallet.repository');
const ConsoleEmailService = require('../../infrastructure/email/console.email.service'); // Using ConsoleEmailService for now
const { appConfig } = require('../../../config/config');
const ms = require('ms'); // Added ms library
const ApiError = require('../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const ApiResponse = require('../../utils/ApiResponse');
const authMiddleware = require('../../middleware/auth.middleware').authenticateToken; // Import the middleware

const router = express.Router();

// Instantiate repositories
const userRepository = new PostgresUserRepository(db); // Pass db object
const walletRepository = new PostgresWalletRepository(db); // Pass db object

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

// Note: JSDoc @typedef schemas previously here have been moved to swagger.js components.schemas
// for central management. Routes now use $ref to these central schemas.

router.post('/register', async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Register a new user.'
    #swagger.description = 'Registers a new user, logs them in, provides an access token in the response body, and sets a refresh token in an HttpOnly cookie.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/UserRegistrationRequest" }
        }
      }
    }
    #swagger.responses[201] = {
      description: 'User registered successfully. Access token provided, refresh token set in cookie.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/AuthResponse" }
        }
      },
      headers: {
        "Set-Cookie": {
          schema: { type: "string", example: "jid=yourRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict" }
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Validation error or user already exists.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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
    const { user: createdUser, accessToken, refreshToken, message } = await registerUserUseCase.execute(value);

    // 3. Set Refresh Token in HttpOnly cookie
    res.cookie(appConfig.jwt.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: appConfig.env === 'production', // Only send over HTTPS in production
      sameSite: 'strict',
      maxAge: appConfig.jwt.refreshExpiration ?
              require('ms')(appConfig.jwt.refreshExpiration) :
              7 * 24 * 60 * 60 * 1000, // Default 7 days
      path: '/api/v1/auth', // Scope cookie to auth paths
    });

    // 4. Send response with Access Token in body
    return new ApiResponse(
      res,
      httpStatusCodes.CREATED,
      message || 'User registered and logged in successfully.',
      { user: createdUser, accessToken }
    ).send();

  } catch (err) {
    // Errors from use case (ApiError) or other unexpected errors
    next(err); // Pass to the centralized error handler
  }
});


router.post('/login', async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Log in and receive Access and Refresh Tokens.'
    #swagger.description = 'Logs in an existing user, provides an access token in the response body, and sets a refresh token in an HttpOnly cookie.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/UserLoginRequest" }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Login successful. Access token provided, refresh token set in cookie.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/AuthResponse" }
        }
      },
      headers: {
        "Set-Cookie": {
          schema: { type: "string", example: "jid=yourRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict" }
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Validation error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[401] = {
      description: 'Invalid credentials.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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


router.post('/refresh', async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Get a new Access Token using a Refresh Token.'
    #swagger.description = 'Requires a valid Refresh Token sent via an HttpOnly cookie (`jid` by default, depends on `appConfig.jwt.refreshCookieName`). If rotation is enabled and a new refresh token is issued, it will also be set in an HttpOnly cookie.'
    #swagger.security = [{ "refreshTokenCookie": [] }]
    #swagger.responses[200] = {
      description: 'New access token generated successfully.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/RefreshTokenResponse" }
        }
      },
      headers: {
        "Set-Cookie": {
          schema: { type: "string", example: "jid=yourNewRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict (if token is rotated)" }
        }
      }
    }
    #swagger.responses[401] = {
      description: 'Invalid, expired, or missing refresh token. The refresh token cookie might be cleared.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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


router.post('/logout', authMiddleware, async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Invalidate the Refresh Token for a secure logout.'
    #swagger.description = 'Requires authentication with an Access Token (Bearer). Clears the refresh token cookie and invalidates the token on the server-side.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Logout successful. Refresh token cookie cleared.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/LogoutResponse" }
        }
      },
      headers: {
        "Set-Cookie": {
          schema: { type: "string", example: "jid=; Path=/api/v1/auth; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" }
        }
      }
    }
    #swagger.responses[401] = {
      description: 'Unauthorized. Invalid or missing access token.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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

router.post('/request-verification-email', authMiddleware, async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Request a new email verification link.'
    #swagger.description = 'User must be authenticated. The verification email is sent to the user\'s registered email address. No request body needed as user email is derived from the auth token.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Verification email sent successfully.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/RequestVerificationEmailResponse" }
        }
      }
    }
    #swagger.responses[401] = {
      description: 'Unauthorized. Invalid or missing access token.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
     #swagger.responses[404] = {
      description: 'User not found or email not associated with token.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error (e.g., email service failure).',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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

router.post('/verify-email', async (req, res, next) => {
  /*
    #swagger.tags = ['Authentication']
    #swagger.summary = 'Verify user\'s email using a token.'
    #swagger.description = 'Submits the token received via email to verify the user\'s email address. This endpoint is public.'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/VerifyEmailRequest" }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Email verified successfully.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/VerifyEmailResponse" }
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Validation error (e.g., missing token) or invalid/expired token.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
    #swagger.responses[500] = {
      description: 'Internal server error.',
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    }
  */
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
