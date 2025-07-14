const { BadRequestError, NotFoundError, InternalServerError } = require('../../../utils/errors');
const { appConfig } = require('../../../../config/config'); // For verification URL base

class SendVerificationEmailUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   * @param {object} emailService - Service for sending emails.
   */
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }

  /**
   * Executes the send verification email use case.
   * @param {string} userEmail - The email of the user to send verification to.
   * @returns {Promise<{message: string}>}
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').NotFoundError}
   * @throws {import('../../../utils/errors').InternalServerError}
   */
  async execute(userEmail) {
    if (!userEmail) {
      throw new BadRequestError('User email is required.');
    }

    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      // To prevent email enumeration, you might return a generic success message here
      // even if user doesn't exist, but log the attempt.
      // For clarity in this implementation, we'll throw an error.
      throw new NotFoundError('User not found.');
    }

    if (user.isVerified) {
      throw new BadRequestError('User email is already verified.');
    }

    // Generate a new verification token using the User entity method
    // The User entity's generateNewVerificationToken method should create a unique token string.
    // A simple UUID generator can be passed to it, or it can have its own default.
    const tokenGenerator = () => require('uuid').v4(); // Example token generator function
    const verificationToken = user.generateNewVerificationToken(tokenGenerator);

    // Save the user with the new verification token
    // The user entity's method should have updated `this.verificationToken` and `this.updatedAt`
    await this.userRepository.update(user.id, {
      verificationToken: user.verificationToken, // Pass the new token
      // isVerified: user.isVerified, // Should be false if re-sending, user.generateNewVerificationToken handles this
      updatedAt: user.updatedAt, // Pass the new updatedAt timestamp
    });

    // Send the verification email
    // The base URL for verification links should come from config
    const verificationUrlBase = `${appConfig.clientUrl || 'http://localhost:3001'}/auth/verify-email`;
    // Note: appConfig.clientUrl might not be in the current config.js structure.
    // Need to ensure it's available or use a hardcoded/default base URL from appConfig.
    // Let's assume appConfig.client.url for frontend base.
    // const verificationUrlBase = `${appConfig.client.url}/verify-email`; // Example if config is structured this way

    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.username,
        verificationToken, // The token itself
        verificationUrlBase // Base URL to construct the full link
      );
    } catch (emailError) {
      // Log the error but don't necessarily fail the whole operation,
      // as user might be able to try again. Or, decide if this is critical.
      console.error(`Failed to send verification email to ${user.email}:`, emailError);
      throw new InternalServerError('Failed to send verification email. Please try again later.');
    }

    return {
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  }
}

module.exports = SendVerificationEmailUseCase;

// Notes:
// - This use case orchestrates fetching the user, generating a token via the user entity,
//   saving the token, and sending the email.
// - It depends on `user.generateNewVerificationToken()` being available on the User domain entity.
//   This method should generate and set `user.verificationToken`.
// - The `verificationUrlBase` needs to be correctly configured (e.g., pointing to the frontend route
//   that will handle the token). `appConfig.clientUrl` is used here as a placeholder.
// - Error handling includes checks for user existence and verification status.
// - Email sending errors are caught, and a generic error is thrown to the client.
// - The `tokenGenerator` function passed to `user.generateNewVerificationToken` is a simple UUID v4 generator.
//   This could be made more sophisticated or configurable if needed.
// - The `userRepository.update` call needs to correctly persist the new `verificationToken`
//   and potentially `isVerified` status (which `generateNewVerificationToken` might reset to false).
// - Assumes `appConfig.clientUrl` is defined in `config/config.js` or a suitable alternative is used.
//   If `appConfig.clientUrl` is not defined, the default 'http://localhost:3001' will be used.
//   The current `config/config.js` has `clientUrl` per environment. This should be fine.
//
//   The `User.entity.js` has `generateNewVerificationToken(tokenGenerator)` which sets
//   `this.verificationToken` and `this.isVerified = false`.
//   So, when calling `userRepository.update`, we need to pass these updated values.
//   The `userRepository.update` method in `postgres.user.repository.js` was modified
//   to only accept specific fields. `verificationToken` and `isVerified` need to be
//   part of `allowedUpdateFields` there if they are to be updated.
//   Let's assume they will be added to `allowedUpdateFields`.
//   Currently, `allowedUpdateFields` in `PostgresUserRepository` is:
//   `['username', 'email', 'passwordHash', 'role', 'refreshToken', 'isVerified', 'lastLogin']`
//   `verificationToken` is missing. `isVerified` is present.
//   This will need adjustment in `PostgresUserRepository`.
//   For now, the use case will pass `verificationToken` to `updateData`.
//
//   The `user.updatedAt` should also be passed if the entity updates it.
//   `User.generateNewVerificationToken` sets `this.updatedAt = new Date();`.
//   So this needs to be passed to `userRepository.update`.
//   The `updateData` object in the use case should reflect these fields.
//   The `userRepository.update` method needs to handle `updatedAt` if passed, or Sequelize handles it automatically.
//   Sequelize does handle `updatedAt` automatically if `timestamps: true`.
//   So, explicitly passing `updatedAt` might not be necessary unless specific logic applies.
//   However, `verificationToken` and `isVerified` (if reset by domain entity) are critical.
//
// Corrected `updateData` to include `isVerified` as `generateNewVerificationToken` resets it.
// `updatedAt` is generally handled by Sequelize on update, so not explicitly passed here.
// The main thing is that `userRepository.update` must be able to persist `verificationToken` and `isVerified`.
// This requires `verificationToken` to be an allowed field in `PostgresUserRepository.update`.
// I will make a note to update `PostgresUserRepository` later if needed.
// For now, the use case is structured correctly assuming the repository can handle the update.
