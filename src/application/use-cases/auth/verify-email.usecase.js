const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class VerifyEmailUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Executes the email verification use case.
   * @param {string} verificationToken - The verification token from the email link.
   * @returns {Promise<{message: string, userId: string}>}
   * @throws {ApiError} If token is invalid, expired, or user not found.
   */
  async execute(verificationToken) {
    if (!verificationToken) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Verification token is required.');
    }

    // Add a new method to UserRepositoryInterface and implement it in PostgresUserRepository
    // e.g., findByVerificationToken(token)
    const user = await this.userRepository.findByVerificationToken(verificationToken);

    if (!user) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Invalid or expired verification token.');
    }

    if (user.isVerified) {
      // Optional: Could just return success if already verified, or inform the user.
      // For now, let's treat it as if the token has already been used or is redundant.
      return {
        message: 'Email is already verified.',
        userId: user.id,
      };
    }

    // Call the domain entity's method to handle verification logic
    user.verifyEmail(); // This sets isVerified = true and verificationToken = null

    // Persist the changes to the user
    // The user entity's verifyEmail method should have updated `this.isVerified`,
    // `this.verificationToken`, and `this.updatedAt`.
    await this.userRepository.update(user.id, {
      isVerified: user.isVerified,
      verificationToken: user.verificationToken, // Should be null now
      // tokenVersion: user.tokenVersion, // No change to tokenVersion for email verification usually
      updatedAt: user.updatedAt, // Pass the new updatedAt timestamp
    });

    return {
      message: 'Email verified successfully.',
      userId: user.id,
    };
  }
}

module.exports = VerifyEmailUseCase;

// Notes:
// - This use case depends on a new method `findByVerificationToken` in the `UserRepositoryInterface`
//   and its implementation in `PostgresUserRepository`. This method needs to be added.
// - The `user.verifyEmail()` method in the User domain entity is responsible for updating
//   the `isVerified` status and clearing the `verificationToken`.
// - The `userRepository.update` call persists these changes. It's important that
//   `PostgresUserRepository.update` can handle `isVerified` and `verificationToken` fields.
//   (This was ensured in the previous step by making the main UserModel the source of truth).
// - Error handling covers invalid/missing tokens and already verified emails.
// - `updatedAt` is passed to `userRepository.update` as the domain entity updates it.
//   Sequelize will also update it, but passing it from domain ensures consistency if there's
//   any specific logic tied to that timestamp in the domain.
//
// Next steps related to this:
// 1. Add `findByVerificationToken` to `UserRepositoryInterface`.
// 2. Implement `findByVerificationToken` in `PostgresUserRepository`.
// 3. Create API endpoint(s) for `SendVerificationEmailUseCase` and `VerifyEmailUseCase`.
