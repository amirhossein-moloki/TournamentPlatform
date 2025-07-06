const logger = require('../utils/logger'); // Assuming logger is in utils
const ApiError = require('../utils/ApiError');
const { NODE_ENV } = process.env;

const errorHandler = (err, req, res, next) => {
    let error = err;

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
