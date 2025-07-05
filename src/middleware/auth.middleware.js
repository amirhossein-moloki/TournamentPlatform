const jwt = require('jsonwebtoken');
const { appConfig } = require('../../config/config');
const ApiError = require('../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
// const PostgresUserRepository = require('../infrastructure/database/repositories/postgres.user.repository'); // If needed for token version check

// const userRepository = new PostgresUserRepository(); // Instantiate if DB check is needed

/**
 * Middleware to authenticate a JWT access token.
 * If authentication is successful, `req.user` will be populated with the token payload.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Access token is required.'));
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret);
    req.user = decoded; // Contains payload like { sub, email, role, iat, exp }

    // Optional: Advanced check - query database to ensure user still exists or token version matches.
    // This adds DB overhead to every authenticated request but increases security.
    // const user = await userRepository.findById(decoded.sub);
    // if (!user) {
    //   return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'User not found.'));
    // }
    // if (user.tokenVersion !== decoded.tokenVersion) { // Assuming tokenVersion is in JWT payload
    //   return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Token version mismatch; session may be invalidated.'));
    // }
    // req.user = user.toPublicProfile(); // Or attach the full domain user entity if preferred by downstream services

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Access token expired.'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid access token.'));
    }
    // For other errors during verification
    return next(new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to authenticate token.'));
  }
};

/**
 * Middleware to authorize based on user roles.
 * Should be used AFTER `authenticateToken` middleware.
 * @param {Array<string>} allowedRoles - An array of roles allowed to access the route.
 * @returns {function} Express middleware function.
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      // This should ideally not happen if authenticateToken runs first and populates req.user
      return next(new ApiError(httpStatusCodes.FORBIDDEN, 'User role not available for authorization.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(
        httpStatusCodes.FORBIDDEN,
        `Access denied. User role '${req.user.role}' is not authorized for this resource.`
      ));
    }
    next();
  };
};


/**
 * Socket.IO middleware for token authentication.
 * Similar to the HTTP middleware but adapted for Socket.IO.
 * @param {object} socket - The Socket.IO socket object.
 * @param {function} next - The Socket.IO next function.
 */
const authenticateSocketToken = async (socket, next) => {
  // Token can be passed in `socket.handshake.auth.token` (preferred for v3+)
  // or as a query parameter, or custom header if using HTTP long-polling first.
  const token = socket.handshake.auth.token || socket.handshake.headers['x-access-token'];

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret);
    socket.user = { // Attach user info to the socket object
      id: decoded.sub,
      email: decoded.email, // Or username
      role: decoded.role,
      // tokenVersion: decoded.tokenVersion // if using token versioning
    };

    // Optional: DB check for user existence or token version (similar to HTTP middleware)
    // const userRecord = await userRepository.findById(decoded.sub);
    // if (!userRecord || (decoded.tokenVersion && userRecord.tokenVersion !== decoded.tokenVersion)) {
    //   return next(new Error('Authentication error: Invalid token or session.'));
    // }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired.'));
    }
    return next(new Error('Authentication error: Invalid token.'));
  }
};


module.exports = {
  authenticateToken,
  authorizeRole,
  authenticateSocketToken, // Export socket middleware
};

// Notes:
// - `authenticateToken`: Extracts JWT from 'Authorization: Bearer {token}' header.
//   Verifies token using `appConfig.jwt.secret`.
//   Populates `req.user` with token payload on success.
//   Handles common JWT errors like `TokenExpiredError` and `JsonWebTokenError`.
//   Includes commented-out section for advanced checks (user existence, token version) which add DB load.
//
// - `authorizeRole`: A higher-order function that takes an array of allowed roles.
//   Checks `req.user.role` (populated by `authenticateToken`) against `allowedRoles`.
//   Returns 403 Forbidden if role is not authorized.
//
// - `authenticateSocketToken`: A Socket.IO specific authentication middleware.
//   It's used with `io.use(authenticateSocketToken)`.
//   It checks for token in `socket.handshake.auth.token` (standard for Socket.IO client v3+).
//   Populates `socket.user` on successful authentication.
//   The `sockets/index.js` file already has a similar inline middleware; this exported function
//   can be used to make it more modular if preferred.
//
// - These middlewares rely on `ApiError` for consistent error responses in the HTTP context.
//   Socket.IO middleware uses `new Error()` for `next(err)`.
//
// - `appConfig.jwt.secret` is crucial and must be securely configured.
// - If user details beyond JWT payload are needed in `req.user`, the middleware would need
//   to fetch the full user object from the database (as shown in commented-out lines).
//   This is a trade-off between performance and having up-to-date user info/status.
