const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetUserProfileUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    if (!userRepository || typeof userRepository.findById !== 'function') {
      throw new Error('GetUserProfileUseCase requires a valid userRepository with a findById method.');
    }
    this.userRepository = userRepository;
  }

  /**
   * Retrieves the profile for a given user ID.
   * @param {string} userId - The ID of the user whose profile is to be retrieved.
   * @returns {Promise<import('../../../domain/user/user.entity').User>} The User domain entity.
   * @throws {ApiError} If the user is not found or other error occurs.
   */
  async execute(userId) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
    }

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        // Aligning with the more specific error message expectation from the test
        throw new ApiError(httpStatusCodes.NOT_FOUND, `User with ID ${userId} not found.`);
      }

      // The repository returns the full User domain entity.
      // The presentation layer (route handler) will be responsible for
      // converting this to a public profile DTO using user.toPublicProfile() if needed.
      return user;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error; // Re-throw ApiErrors directly
      }
      console.error('Error fetching user profile by ID:', error);
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve user profile.');
    }
  }
}

module.exports = GetUserProfileUseCase;

// Notes:
// - Constructor now validates the userRepository.
// - Error message for "not found" is made more specific.
// - Added a try-catch block to handle unexpected repository errors.
// - The decision to return the full User entity and let the presentation layer
//   handle `toPublicProfile()` is maintained as per the original code's comments.
