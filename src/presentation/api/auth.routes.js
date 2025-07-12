const router = require('express').Router();
const { Joi, validate } = require('express-validation');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

// Joi validation schemas
const registerSchema = {
    body: Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
    }),
};

const loginSchema = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),
};

const verifyEmailSchema = {
    body: Joi.object({
        token: Joi.string().required(),
    }),
};

// --- Routes ---

router.post('/register', validate(registerSchema), authController.register);
/*  #swagger.tags = ['Auth']
    #swagger.summary = 'Register a new user'
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
        description: 'User registered successfully.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
        headers: {
            "Set-Cookie": {
                description: "Refresh token cookie.",
                schema: { type: "string", example: "jid=yourRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict" }
            }
        }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[409] = { $ref: '#/components/responses/ConflictError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.post('/login', validate(loginSchema), authController.login);
/*  #swagger.tags = ['Auth']
    #swagger.summary = 'Log in an existing user'
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
        description: 'Login successful.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
        headers: {
            "Set-Cookie": {
                description: "Refresh token cookie.",
                schema: { type: "string", example: "jid=yourRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict" }
            }
        }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.post('/refresh', authController.refresh);
/*  #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh an access token'
    #swagger.description = 'Requires a valid Refresh Token sent via an HttpOnly cookie (`jid`). If rotation is enabled and a new refresh token is issued, it will also be set in an HttpOnly cookie.'
    #swagger.security = [{ "refreshTokenCookie": [] }]
    #swagger.responses[200] = {
        description: 'New access token generated.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenResponse" } } },
        headers: {
            "Set-Cookie": {
                schema: { type: "string", example: "jid=yourNewRefreshToken; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict (if token is rotated)" }
            }
        }
    }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.post('/logout', authenticateToken, authController.logout);
/*  #swagger.tags = ['Auth']
    #swagger.summary = 'Log out the current user'
    #swagger.description = 'Invalidates the Refresh Token and clears the refresh token cookie.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
        description: 'Logout successful.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/LogoutResponse" } } },
        headers: {
            "Set-Cookie": {
                description: "Refresh token cookie cleared.",
                schema: { type: "string", example: "jid=; Path=/api/v1/auth; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" }
            }
        }
    }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.post('/request-verification-email', authenticateToken, authController.requestVerificationEmail);
/*  #swagger.tags = ['Auth']
    #swagger.summary = 'Request a new email verification link'
    #swagger.description = 'User must be authenticated. The verification email is sent to the user\'s registered email address.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
        description: 'Verification email sent.',
        content: { "application/json": { schema: { $ref: "#/components/schemas/RequestVerificationEmailResponse" } } }
    }
    #swagger.responses[401] = { $ref: '#/components/responses/UnauthorizedError' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFoundError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
/*  #swagger.tags = ['Auth']
    #swagger.summary = "Verify user's email using a token"
    #swagger.description = "Submits the token received via email to verify the user's email address."
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
        content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyEmailResponse" } } }
    }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequestError' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
*/

module.exports = router;
