const jwt = require('jsonwebtoken');
const { appConfig } = require('../../config/config');
const ApiError = require('../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { PostgresUserRepository } = require('../infrastructure/database/repositories/postgres.user.repository');

/**
 * Middleware to authenticate a JWT access token.
 * If authentication is successful, `req.user` will be populated with the token payload.
 */
const authenticateToken = (userRepository) => async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Access token is required.'));
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret);

    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'User not found.'));
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Token version mismatch; session may be invalidated.'));
    }

    req.user = user.toPublicProfile();

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Access token expired.'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid access token.'));
    }
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
    if (!req.user || !req.user.roles || req.user.roles.length === 0) {
      return next(new ApiError(httpStatusCodes.FORBIDDEN, 'User roles not available for authorization.'));
    }

    const hasRequiredRole = req.user.roles.some(userRole => allowedRoles.includes(userRole));

    if (!hasRequiredRole) {
      return next(new ApiError(
        httpStatusCodes.FORBIDDEN,
        `Access denied. User roles do not include required permissions for this resource. User has: [${req.user.roles.join(', ')}], Required one of: [${allowedRoles.join(', ')}]`
      ));
    }
    next();
  };
};


/**
 * Socket.IO middleware for token authentication.
 * @param {object} socket - The Socket.IO socket object.
 * @param {function} next - The Socket.IO next function.
 */
const authenticateSocketToken = (userRepository) => async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['x-access-token'];

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret);

    const userRecord = await userRepository.findById(decoded.sub);
    if (!userRecord || (decoded.tokenVersion && userRecord.tokenVersion !== decoded.tokenVersion)) {
      return next(new Error('Authentication error: Invalid token or session.'));
    }

    socket.user = userRecord.toPublicProfile();
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
  authenticateSocketToken,
};
