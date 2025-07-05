const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { appConfig } = require('../../../../config/config');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { User } = require('../../../domain/user/user.entity'); // Assuming User entity is correctly imported

class LoginUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Executes the login use case.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<{user: UserPublicProfile, accessToken: string, refreshToken: string}>}
   * @throws {ApiError} If login fails.
   */
  async execute(email, password) {
    if (!email || !password) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Email and password are required.');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid email or password.');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid email or password.');
    }

    if (!user.isVerified) {
      // Depending on policy, you might allow login but restrict access, or deny login.
      // For now, let's treat it as a reason to deny full access or prompt for verification.
      // This could be a specific error code or message.
      // For simplicity, we'll throw an error here.
      throw new ApiError(httpStatusCodes.FORBIDDEN, 'Account not verified. Please verify your email.');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token (e.g., in database against user record)
    // This step is crucial for managing refresh token validity and revocation.
    user.refreshToken = refreshToken; // Assuming the entity can hold this temporarily or it's part of update
    await this.userRepository.update(user.id, { refreshToken, lastLogin: new Date() });

    // Update last login time
    // (Handled above with refreshToken update for efficiency)

    return {
      user: this.formatUserPublicProfile(user),
      accessToken,
      refreshToken, // This will be set as an HttpOnly cookie by the controller
    };
  }

  generateAccessToken(user) {
    const payload = {
      sub: user.id, // Subject (user ID)
      email: user.email,
      role: user.role,
      // Add any other claims needed for quick access, but keep it minimal
    };
    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.accessExpiration,
    });
  }

  generateRefreshToken(user) {
    const payload = {
      sub: user.id,
      // You might add a version number or a random string to allow invalidating
      // all refresh tokens for a user if needed (e.g., password change).
      // tokenVersion: user.tokenVersion (if you implement such a mechanism)
    };
    return jwt.sign(payload, appConfig.jwt.secret, { // Should use a DIFFERENT secret or a dedicated refresh secret
                                                       // For simplicity of blueprint, using same secret.
                                                       // In a real high-security scenario, refresh token secret should be different and stronger.
      expiresIn: appConfig.jwt.refreshExpiration,
    });
  }

  formatUserPublicProfile(user) {
    // Ensure only public information is returned
    return {
      id: user.id,
      username: user.username,
      email: user.email, // Email might be considered sensitive, adjust based on requirements
      role: user.role,
    };
  }
}

module.exports = LoginUseCase;

/**
 * @typedef {object} UserPublicProfile
 * @property {string} id
 * @property {string} username
 * @property {string} email - Optional, depending on privacy requirements.
 * @property {string} role
 */
