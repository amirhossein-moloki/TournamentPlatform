/**
 * Utility class for sending standardized API responses.
 */
class ApiResponse {
  /**
   * Creates an instance of ApiResponse.
   * @param {object} res - The Express response object.
   * @param {number} statusCode - The HTTP status code for the response.
   * @param {string} message - A human-readable message for the response.
   * @param {object|Array|null} [data=null] - The data payload of the response.
   * @param {object} [additionalFields={}] - Any additional top-level fields for the response object.
   */
  constructor(res, statusCode, message, data = null, additionalFields = {}) {
    this.res = res;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.additionalFields = additionalFields;
    this.success = statusCode >= 200 && statusCode < 300; // Success based on status code range
  }

  /**
   * Constructs the JSON response object.
   * @returns {object} The response object to be sent.
   */
  _prepareResponse() {
    const response = {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      ...this.additionalFields,
    };

    // Only include the 'data' field if it's not null or undefined.
    // Some prefer to always include it, even if null. This implementation omits it if null/undefined.
    if (this.data !== null && this.data !== undefined) {
      response.data = this.data;
    }
    return response;
  }

  /**
   * Sends the standardized JSON response.
   */
  send() {
    this.res.status(this.statusCode).json(this._prepareResponse());
  }

  /**
   * Static helper to quickly send a success response.
   * @param {object} res - Express response object.
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Success message.
   * @param {object|Array|null} [data=null] - Data payload.
   */
  static success(res, statusCode, message, data = null) {
    new ApiResponse(res, statusCode, message, data).send();
  }

  /**
   * Static helper to quickly send an error response.
   * (Note: This is for generic errors. For ApiError instances, use the error handling middleware).
   * @param {object} res - Express response object.
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Error message.
   * @param {object|Array|null} [errors=null] - Detailed errors.
   */
  static error(res, statusCode, message, errors = null) {
    // This static error method might not be used if a global error handler
    // catches ApiError instances and formats them. But it can be a utility.
    const responsePayload = {
      success: false,
      statusCode,
      message,
    };
    if (errors) {
      responsePayload.errors = errors;
    }
    res.status(statusCode).json(responsePayload);
  }
}

module.exports = ApiResponse;

// Example Usage:
// In a controller:
// const apiResponse = new ApiResponse(res, 200, "Data fetched successfully", { user: userData });
// apiResponse.send();
//
// Or using static helper:
// ApiResponse.success(res, 201, "Resource created", newResource);
//
// For errors, typically you'd `throw new ApiError(...)` and let middleware handle it.
// But if needed:
// ApiResponse.error(res, 500, "An unexpected error occurred.");
//
// The constructor directly takes the `res` object to call `res.status().json()` in the `send()` method.
// This makes it convenient to use: `new ApiResponse(...).send()`.
// The `_prepareResponse` method ensures a consistent structure.
// The `success` field is automatically determined from the `statusCode`.
