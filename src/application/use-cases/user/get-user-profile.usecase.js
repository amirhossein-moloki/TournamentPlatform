const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetUserProfileUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Retrieves the profile for a given user ID.
   * @param {string} userId - The ID of the user whose profile is to be retrieved.
   * @returns {Promise<import('../../../domain/user/user.entity').User>} The User domain entity.
   * @throws {ApiError} If the user is not found.
   */
  async execute(userId) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
    }

    // The repository returns the full User domain entity.
    // The presentation layer (route handler) will be responsible for
    // converting this to a public profile DTO using user.toPublicProfile() if needed.
    return user;
  }
}

module.exports = GetUserProfileUseCase;

// Notes:
// - This use case is straightforward: fetches a user by ID.
// - It relies on `userRepository.findById()`.
// - If the user is not found, it throws a 404 ApiError.
// - It returns the full User domain entity. The route handler that calls this
//   will then use the `user.toPublicProfile()` method to select which fields to expose to the client.
//   This keeps the use case focused on fetching the core domain object.
