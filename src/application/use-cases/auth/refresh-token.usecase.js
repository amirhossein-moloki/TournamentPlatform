const jwt = require('jsonwebtoken');
const { appConfig } = require('../../../../config/config');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class RefreshTokenUseCase {
  /**
   * @param {object} userRepository - Repository for user data persistence.
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Executes the refresh token use case.
   * @param {string} refreshToken - The refresh token provided by the client (usually from a cookie).
   * @returns {Promise<{accessToken: string, user?: any, newRefreshToken?: string}>}
   *          Returns a new access token.
   *          Optionally, user details and a new rotated refresh token can be returned.
   * @throws {ApiError} If the refresh token is invalid, expired, or other errors occur.
   */
  async execute(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token is required.');
    }

    let decodedRefreshToken;
    try {
      // Verify the refresh token structure and expiration
      // Note: Using the same secret for access and refresh tokens is not ideal for production.
      // Consider using a dedicated REFRESH_TOKEN_SECRET.
      decodedRefreshToken = jwt.verify(refreshToken, appConfig.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token expired.');
      }
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid refresh token.');
    }

    const userId = decodedRefreshToken.sub;
    if (!userId) {
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Invalid refresh token payload (missing sub).');
    }

    // Find the user associated with the refresh token
    // The userRepository.findByRefreshToken should ensure the token matches the one stored for the user.
    const user = await this.userRepository.findByRefreshToken(refreshToken);
    if (!user) {
      // This means the token was validly signed but is not the current one for the user,
      // or the user doesn't exist. This could indicate a stolen/reused token.
      throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token not recognized or has been invalidated.');
    }

    // Optional: Check token version if implementing advanced JWT invalidation
    // This requires tokenVersion to be part of the refresh token payload and user entity.
    // if (decodedRefreshToken.tokenVersion !== user.tokenVersion) {
    //   // Invalidate this refresh token in DB as a security measure
    //   await this.userRepository.update(user.id, { refreshToken: null });
    //   throw new ApiError(httpStatusCodes.UNAUTHORIZED, 'Refresh token version mismatch (session invalidated).');
    // }

    // User is valid, and refresh token is current. Issue a new access token.
    const newAccessToken = this.generateAccessToken(user);

    // Optional: Implement Refresh Token Rotation
    // If implemented, generate a new refresh token, store it, and return it to the client.
    // const newRefreshToken = this.generateRefreshToken(user);
    // await this.userRepository.update(user.id, { refreshToken: newRefreshToken });
    // return { accessToken: newAccessToken, newRefreshToken, user: this.formatUserPublicProfile(user) };

    return {
      accessToken: newAccessToken,
      // Optionally return user profile if needed by client upon refresh
      // user: this.formatUserPublicProfile(user),
    };
  }

  generateAccessToken(user) {
    const payload = {
      sub: user.id,
      email: user.email, // Or username, depending on what's preferred
      roles: user.roles,
      // tokenVersion: user.tokenVersion, // Include if checking tokenVersion on access tokens too
    };
    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.accessExpiration,
    });
  }

  // generateRefreshToken(user) { // For refresh token rotation
  //   const payload = {
  //     sub: user.id,
  //     tokenVersion: user.tokenVersion,
  //   };
  //   return jwt.sign(payload, appConfig.jwt.secret, { // Use dedicated refresh secret
  //     expiresIn: appConfig.jwt.refreshExpiration,
  //   });
  // }

  // formatUserPublicProfile(user) { // If returning user info
  //   return {
  //     id: user.id,
  //     username: user.username,
  //     email: user.email,
  //     role: user.role,
  //   };
  // }
}

module.exports = RefreshTokenUseCase;
// Notes:
// - This use case handles the core logic of validating a refresh token and issuing a new access token.
// - It relies on `userRepository.findByRefreshToken` to check if the provided token is the one currently stored for the user.
// - Security considerations:
//   - Use a separate, stronger secret for refresh tokens if possible. `appConfig.jwt.secret` is used here for simplicity.
//   - Refresh Token Rotation: The code includes commented-out placeholders for implementing rotation.
//     This is a security best practice where a new refresh token is issued each time one is used,
//     and the old one is invalidated. This helps detect token theft if an old token is replayed.
//   - Token Versioning: Also includes commented-out placeholders for `tokenVersion` checking. This allows
//     invalidating all tokens for a user (e.g., after a password change) by incrementing `user.tokenVersion`.
// - The use case currently only returns a new access token. It can be extended to return user details or a new refresh token if rotation is implemented.
// - Error handling is done via `ApiError` for consistent API responses.
