const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { User } = require('../../../domain/user/user.entity'); // Assuming User entity is correctly imported
// const { appConfig } = require('../../../../config/config'); // Not directly needed for registration logic itself usually

// Interface for an email service (to be implemented in infrastructure)
// class EmailService {
//   async sendVerificationEmail(email, verificationToken) {
//     throw new Error("EmailService.sendVerificationEmail not implemented");
//   }
// }

class RegisterUserUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   * @param {object} walletRepository - Repository for wallet data persistence.
   * @param {object} [emailService] - Optional email service for sending verification emails.
   */
  constructor(userRepository, walletRepository, emailService = null) {
    this.userRepository = userRepository;
    this.walletRepository = walletRepository;
    this.emailService = emailService; // For sending verification emails
  }

  /**
   * Executes the user registration use case.
   * @param {object} userData - The user data for registration.
   * @param {string} userData.username - The desired username.
   * @param {string} userData.email - The user's email address.
   * @param {string} userData.password - The user's chosen password.
   * @returns {Promise<{user: UserPublicProfile, message: string}>}
   * @throws {ApiError} If registration fails (e.g., email/username taken, validation error).
   */
  async execute({ username, email, password }) {
    // Basic validation (more comprehensive validation should be at controller/Joi level)
    if (!username || !email || !password) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Username, email, and password are required.');
    }
    if (password.length < 8) { // Example: Password policy
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Password must be at least 8 characters long.');
    }

    // Check if email or username is already taken
    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new ApiError(httpStatusCodes.CONFLICT, 'Email address is already in use.');
    }

    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw new ApiError(httpStatusCodes.CONFLICT, 'Username is already taken.');
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = uuidv4();
    // const verificationToken = uuidv4(); // Generate a token for email verification

    const newUser = new User(
      userId,
      username,
      email,
      passwordHash,
      'User', // Default role
      null,   // refreshToken initially null
      false,  // isVerified initially false
      null    // lastLogin initially null
      // verificationToken // Store this if implementing email verification
    );

    // Persist the new user
    const createdUser = await this.userRepository.create(newUser);

    // Create a wallet for the new user
    // This should ideally be part of a transaction with user creation
    // to ensure atomicity. Sequelize transactions can be used here if
    // userRepository.create and walletRepository.create support a transaction object.
    try {
      const walletId = uuidv4();
      // Assuming Wallet entity/constructor exists or repository handles creation from params
      await this.walletRepository.create({
        id: walletId,
        userId: createdUser.id,
        balance: 0.00,
        currency: 'USD', // Default currency, should be configurable
      });
    } catch (walletError) {
      // If wallet creation fails, we should ideally roll back user creation.
      // This highlights the need for transactional operations.
      // For now, log the error and potentially delete the created user.
      console.error(`Failed to create wallet for user ${createdUser.id}:`, walletError);
      // await this.userRepository.delete(createdUser.id); // Rollback user
      // throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'User registration failed during wallet creation.');
      // Or, mark user as incomplete / requiring attention.
      // For this implementation, we'll proceed but acknowledge the issue.
      // A robust solution would use a transaction manager or unit of work pattern.
      throw new ApiError(
        httpStatusCodes.INTERNAL_SERVER_ERROR,
        'User registered, but wallet creation failed. Please contact support.'
      );
    }


    // Send verification email (if emailService is provided)
    // if (this.emailService && typeof this.emailService.sendVerificationEmail === 'function') {
    //   try {
    //     await this.emailService.sendVerificationEmail(createdUser.email, verificationToken);
    //   } catch (emailError) {
    //     console.error(`Failed to send verification email to ${createdUser.email}:`, emailError);
    //     // Don't fail the registration for this, but log it. User can request verification email again.
    //   }
    // }

    return {
      user: this.formatUserPublicProfile(createdUser),
      // message: this.emailService ? 'Registration successful. Please check your email to verify your account.' : 'Registration successful.',
      message: 'Registration successful. Please verify your email (feature pending).',
    };
  }

  formatUserPublicProfile(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}

module.exports = RegisterUserUseCase;

/**
 * @typedef {object} UserPublicProfile
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} role
 * @property {boolean} isVerified
 */
