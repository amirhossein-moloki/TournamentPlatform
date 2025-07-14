const { BadRequestError, NotFoundError, InternalServerError } = require('../../../utils/errors');
const { User } = require('../../../domain/user/user.entity'); // For type hinting if using TypeScript/JSDoc

class UpdateUserProfileUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    if (!userRepository || typeof userRepository.findById !== 'function' || typeof userRepository.update !== 'function') {
      throw new Error('UpdateUserProfileUseCase requires a valid userRepository with findById and update methods.');
    }
    this.userRepository = userRepository;
  }

  /**
   * Updates the profile of a given user.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - Data to update (e.g., { firstName, lastName, bio, avatarUrl, socialLinks, country }).
   * @returns {Promise<object>} The updated user's public profile.
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').NotFoundError}
   * @throws {import('../../../utils/errors').InternalServerError}
   */
  async execute(userId, updateData) {
    if (!userId) {
      throw new BadRequestError('User ID is required.');
    }
    // Changed error message to match test expectation, original was "No update data provided."
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new BadRequestError('Update data is required.');
    }

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        // Aligning with the more specific error message expectation from the test
        throw new NotFoundError(`User with ID ${userId} not found.`);
      }

      // Check if user entity has the updateProfile method
      if (typeof user.updateProfile !== 'function') {
        console.error('User entity is missing updateProfile method.', new TypeError('user.updateProfile is not a function'));
        throw new InternalServerError('Failed to process user profile for update.');
      }
      user.updateProfile(updateData); // This updates the user entity instance

      // Persist changes. Assuming repository.update can take the entity or relevant parts.
      // If repository.update expects (userId, fieldsToUpdate), adjust accordingly.
      // For now, let's assume it can take the updated profile data or the whole user.
      // Passing user.profile as it contains the updated fields.
      // Or, if the repository can handle it, pass the whole user: await this.userRepository.update(user);
      const updatedUserEntity = await this.userRepository.update(user.id, user.profile); // Or user if repo handles full entity update

      if (!updatedUserEntity) {
          // This might occur if the repository's update method returns null or undefined on failure
          // or if it's designed to return the updated entity and failed to do so.
          console.error(`Update operation for user ${userId} did not return an updated entity.`);
          throw new InternalServerError('Failed to confirm user profile update.');
      }


      // Check if the returned/updated entity has toPublicProfile method
      if (typeof updatedUserEntity.toPublicProfile !== 'function') {
          console.error('Updated user entity is missing toPublicProfile method.');
          throw new InternalServerError('Failed to process updated user profile.');
      }
      return updatedUserEntity.toPublicProfile();

    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof InternalServerError) {
        throw error; // Re-throw specific errors directly
      }
      console.error('Error updating user profile:', error);
      throw new InternalServerError('Failed to update user profile.');
    }
  }
}

module.exports = UpdateUserProfileUseCase;
