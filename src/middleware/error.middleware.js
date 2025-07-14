const logger = require('../utils/logger'); // Assuming logger is in utils
const ApiError = require('../utils/ApiError');
const { NODE_ENV } = process.env;
const { BaseError, ValidationError, UniqueConstraintError } = require('sequelize');


const errorHandler = (err, req, res, next) => {
    let error = err;

    if (err instanceof UniqueConstraintError) {
      const message = `Duplicate field value: ${err.errors.map(e => e.path).join(', ')}`;
      error = new ApiError(409, message, err.errors);
    } else if (err instanceof ValidationError) {
      const message = `Validation error: ${err.errors.map(e => e.message).join(', ')}`;
      error = new ApiError(400, message, err.errors);
    } else if (err instanceof BaseError) {
        // Handle other generic Sequelize errors
        error = new ApiError(500, `Database Error: ${err.message}`);
    }


    // If the error is not an instance of ApiError, convert it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || error.status || 500;
        const message = error.message || 'Something went wrong';
        error = new ApiError(statusCode, message, error.errors || [], error.stack);
    }

    // Log the error
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${error.statusCode}, Message:: ${error.message} ${NODE_ENV === 'development' ? `\nStack:: ${error.stack}` : ''}`);

    // Prepare the response
    const response = {
        success: false,
        message: error.message,
        ...(NODE_ENV === 'development' && { stack: error.stack }), // Include stack in development
        ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    };

    // Send the response
    res.status(error.statusCode).json(response);
};

module.exports = {
    errorHandler,
};
