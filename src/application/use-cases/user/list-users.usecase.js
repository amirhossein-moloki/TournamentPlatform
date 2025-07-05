const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class ListUsersUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Retrieves a list of users with pagination and filtering (for admin purposes).
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - Page number.
   * @param {number} [options.limit=10] - Items per page.
   * @param {object} [options.filters] - Filters (e.g., { role, isVerified }).
   * // Sorting options can be added if needed:
   * // @param {string} [options.sortBy='createdAt']
   * // @param {string} [options.sortOrder='DESC']
   * @returns {Promise<{users: Array<import('../../../domain/user/user.entity').User>, total: number, page: number, limit: number}>}
   *          Paginated list of User domain entities.
   * @throws {ApiError} If fetching fails.
   */
  async execute({ page = 1, limit = 10, filters = {} /*, sortBy = 'createdAt', sortOrder = 'DESC'*/ }) {
    // Validate and sanitize pagination parameters
    const sanePage = Math.max(1, parseInt(page, 10) || 1);
    let saneLimit = Math.max(1, parseInt(limit, 10) || 10);
    if (saneLimit > 100) saneLimit = 100; // Max limit enforcement

    try {
      // The userRepository.findAll method is expected to handle these parameters.
      // It should return an object like { users: User[], total: number, page: number, limit: number }
      const result = await this.userRepository.findAll({
        page: sanePage,
        limit: saneLimit,
        filters,
        // sortBy, // Pass if repository supports it
        // sortOrder, // Pass if repository supports it
      });

      if (!result || typeof result.total !== 'number' || !Array.isArray(result.users) ||
          typeof result.page !== 'number' || typeof result.limit !== 'number') {
        console.error('Invalid response structure from userRepository.findAll:', result);
        throw new Error('Failed to retrieve users due to repository error.');
      }

      // The repository already returns User domain entities and pagination info.
      // No further mapping is typically needed here unless transforming into a specific DTO.
      // The presentation layer (route handler) will map these domain entities to public profiles.
      return result; // { users: User[], total: number, page: number, limit: number }

    } catch (error) {
      console.error('Error listing users in use case:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve users.');
    }
  }
}

module.exports = ListUsersUseCase;

// Notes:
// - This use case is primarily for admin functionality to list users.
// - It relies on `userRepository.findAll()` which should support pagination and filtering.
//   The current `PostgresUserRepository.findAll` supports `page`, `limit`, and basic `filters` for `role` and `isVerified`.
//   It also returns `page` and `limit` in its response, which this use case now expects.
// - Sorting options are commented out but can be added if the repository supports them.
// - Returns full User domain entities. The API route handler will be responsible for mapping these
//   to public DTOs (e.g., using `user.toPublicProfile()`) to avoid exposing sensitive data.
// - Includes max limit enforcement.
// - Added a check for the structure of `result` from the repository for robustness.
