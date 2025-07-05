/**
 * Custom Error class for API-specific errors.
 * Extends the built-in Error class to include a statusCode and optional detailed errors array.
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @param {number} statusCode - The HTTP status code for this error.
   * @param {string} message - The error message.
   * @param {Array<string>} [errors=[]] - Optional array of detailed error messages (e.g., validation errors).
   * @param {string} [stack=''] - Optional stack trace. If not provided, it will be captured.
   */
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.data = null; // Can be used to send additional data with the error
    this.success = false; // Indicates operation was not successful
    this.errors = errors.length > 0 ? errors : undefined; // Only include 'errors' if it has content

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;

// Example Usage:
// throw new ApiError(400, "Validation Failed", ["Email is required", "Password too short"]);
// throw new ApiError(404, "Resource not found");
//
// In an error handling middleware:
// if (err instanceof ApiError) {
//   return res.status(err.statusCode).json({
//     success: false,
//     message: err.message,
//     errors: err.errors, // This will be undefined if no detailed errors were passed
//     // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Optionally show stack in dev
//   });
// }
