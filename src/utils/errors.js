const ApiError = require('./ApiError');
const httpStatusCodes = require('http-status-codes');

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = []) {
    super(httpStatusCodes.BAD_REQUEST, message, errors);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(httpStatusCodes.UNAUTHORIZED, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(httpStatusCodes.FORBIDDEN, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(httpStatusCodes.NOT_FOUND, message);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(httpStatusCodes.CONFLICT, message);
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(httpStatusCodes.INTERNAL_SERVER_ERROR, message);
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
