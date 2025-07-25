const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, ConflictError, InternalServerError } = require('../../../utils/errors');
const { User } = require('../../../domain/user/user.entity'); // Assuming User entity is correctly imported
const jwt = require('jsonwebtoken');
const { appConfig } = require('../../../../config/config');
const { withTransaction } = require('../../../infrastructure/database/postgres.connector');

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
   * @returns {Promise<{user: UserPublicProfile, accessToken: string, refreshToken: string, message: string}>}
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').ConflictError}
   * @throws {import('../../../utils/errors').InternalServerError}
   */
  async execute({ username, email, password }) {
    // Basic validation (more comprehensive validation should be at controller/Joi level)
    if (!username || !email || !password) {
      throw new BadRequestError('Username, email, and password are required.');
    }
    if (password.length < 8) { // Example: Password policy
      throw new BadRequestError('Password must be at least 8 characters long.');
    }

    // Check if email or username is already taken
    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictError('Email address is already in use.');
    }

    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw new ConflictError('Username is already taken.');
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
    const createdUser = await withTransaction(async (transaction) => {
      // Persist the new user within the transaction
      const user = await this.userRepository.create(newUser, { transaction });

      // Create a wallet for the new user within the same transaction
      const walletId = uuidv4();
      await this.walletRepository.create({
        id: walletId,
        userId: user.id,
        balance: 0.00,
        currency: 'USD', // Default currency, should be configurable
      }, { transaction });

      return user;
    });


    // Send verification email (if emailService is provided)
    // if (this.emailService && typeof this.emailService.sendVerificationEmail === 'function') {
    //   try {
    //     await this.emailService.sendVerificationEmail(createdUser.email, verificationToken);
    //   } catch (emailError) {
    //     console.error(`Failed to send verification email to ${createdUser.email}:`, emailError);
    //     // Don't fail the registration for this, but log it. User can request verification email again.
    //   }
    // }

    // Generate tokens for the newly registered user
    const accessToken = this.generateAccessToken(createdUser);
    const refreshToken = this.generateRefreshToken(createdUser);

    // Store refresh token and set lastLogin for the new user
    // The user object 'createdUser' here is the one returned by userRepository.create,
    // which should be a domain entity or easily convertible to one.
    await this.userRepository.update(createdUser.id, { refreshToken, lastLogin: new Date() });

    // The user object passed to formatUserPublicProfile should have isVerified status
    // If userRepository.update doesn't return the updated user, we use createdUser which has the initial state.
    // It's often good practice for repository update methods to return the updated entity.
    // For now, we assume createdUser has the necessary fields for formatUserPublicProfile.

    return {
      user: this.formatUserPublicProfile(createdUser), // Pass the original createdUser
      accessToken,
      refreshToken,
      message: 'Registration successful. Account created and logged in.',
      // Consider if email verification message is still needed here or handled differently
    };
  }

  generateAccessToken(user) {
    const payload = {
      sub: user.id, // Subject (user ID)
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.accessExpiration,
    });
  }

  generateRefreshToken(user) {
    const payload = {
      sub: user.id,
    };
    return jwt.sign(payload, appConfig.jwt.secret, { // Ideally a different secret for refresh tokens
      expiresIn: appConfig.jwt.refreshExpiration,
    });
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
 * @property {string} email // Email might be considered sensitive, adjust based on requirements
 * @property {string} role
 * @property {boolean} isVerified // Ensure this reflects the actual status after registration
 */
