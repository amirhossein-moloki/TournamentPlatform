const { InternalServerError } = require('../../../utils/errors');

class ListUsersUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    if (!userRepository || typeof userRepository.findAll !== 'function') {
      throw new Error('ListUsersUseCase requires a valid userRepository with a findAll method.');
    }
    this.userRepository = userRepository;
  }

  /**
   * Retrieves a list of users with pagination and filtering (for admin purposes).
   * Returns public profiles of users.
   * @param {object} options - Options for listing.
   * @param {number} [options.page=1] - Page number.
   * @param {number} [options.limit=10] - Items per page.
   * @param {object} [options.filters] - Filters (e.g., { role, isVerified }).
   * @param {string} [options.sortBy='createdAt'] - Field to sort by.
   * @param {string} [options.sortOrder='DESC'] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<{users: Array<object>, totalItems: number, totalPages: number, currentPage: number, pageSize: number}>}
   *          Paginated list of user public profiles.
   * @throws {import('../../../utils/errors').InternalServerError} If fetching fails.
   */
  async execute({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' }) {
    const sanePage = Math.max(1, parseInt(page, 10) || 1);
    let saneLimit = Math.max(1, parseInt(limit, 10) || 10);
    if (saneLimit > 100) saneLimit = 100;

    try {
      const repoResult = await this.userRepository.findAll({
        page: sanePage,
        limit: saneLimit,
        filters,
        sortBy, // Pass sortBy to repository
        sortOrder, // Pass sortOrder to repository
      });

      if (!repoResult || typeof repoResult.total !== 'number' || !Array.isArray(repoResult.users) ||
          typeof repoResult.page !== 'number' || typeof repoResult.limit !== 'number') {
        console.error('Invalid response structure from userRepository.findAll:', repoResult);
        // Keep original error message from test for consistency for now
        throw new Error('Failed to retrieve users due to repository error.');
      }

      const publicProfiles = repoResult.users
        .map(user => {
          if (user && typeof user.toPublicProfile === 'function') {
            return user.toPublicProfile();
          }
          // Log error for entities that cannot be converted
          console.error(`User entity (ID: ${user ? user.id : 'unknown'}) is missing 'toPublicProfile' method or is not a valid User instance. Skipping.`);
          return null;
        })
        .filter(profile => profile !== null); // Filter out nulls from entities that couldn't be processed

      const totalItems = repoResult.total;
      const totalPages = Math.ceil(totalItems / saneLimit);

      return {
        users: publicProfiles,
        totalItems,
        totalPages,
        currentPage: repoResult.page,
        pageSize: repoResult.limit,
      };

    } catch (error) {
      // Aligning console error message with test expectation
      console.error('Error listing users:', error);
      if (error instanceof InternalServerError) throw error;
      throw new InternalServerError('Failed to retrieve users.');
    }
  }
}

module.exports = ListUsersUseCase;
