/**
 * Represents a User in the system.
 * This class encapsulates the properties and behavior of a user,
 * independent of how it's stored or presented.
 */
class User {
  /**
   * @param {string} id - The unique identifier for the user (UUID).
   * @param {string} username - The user's chosen username.
   * @param {string} email - The user's email address.
   * @param {string} passwordHash - The hashed password for the user.
   * @param {string} role - The role of the user (e.g., 'User', 'Admin').
   * @param {string|null} refreshToken - The current refresh token for the user.
   * @param {boolean} isVerified - Flag indicating if the user's email is verified.
   * @param {Date|null} lastLogin - Timestamp of the user's last login.
   * @param {Date} [createdAt] - Timestamp of when the user was created.
   * @param {Date} [updatedAt] - Timestamp of when the user was last updated.
   * @param {string|null} [verificationToken] - Token for email verification.
   * @param {number} [tokenVersion=0] - Version number for tokens, can be used to invalidate all tokens.
   */
  constructor(
    id,
    username,
    email,
    passwordHash,
    role = 'User',
    refreshToken = null,
    isVerified = false,
    lastLogin = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    verificationToken = null,
    tokenVersion = 0
  ) {
    if (!id) throw new Error('User ID is required.');
    if (!username) throw new Error('Username is required.');
    if (!email) throw new Error('Email is required.');
    if (!passwordHash) throw new Error('Password hash is required.');
    if (!role) throw new Error('User role is required.');

    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.refreshToken = refreshToken;
    this.isVerified = isVerified;
    this.lastLogin = lastLogin;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.verificationToken = verificationToken; // For email verification process
    this.tokenVersion = tokenVersion; // For advanced token invalidation strategies
  }

  /**
   * Verifies the user's email.
   */
  verifyEmail() {
    if (this.isVerified) {
      // Optional: throw an error or just ignore if already verified
      console.warn(`User ${this.email} is already verified.`);
      return;
    }
    this.isVerified = true;
    this.verificationToken = null; // Clear the token once verified
    this.updatedAt = new Date();
  }

  /**
   * Updates the user's password.
   * @param {string} newPasswordHash - The new hashed password.
   */
  updatePassword(newPasswordHash) {
    if (!newPasswordHash) throw new Error('New password hash is required.');
    this.passwordHash = newPasswordHash;
    this.incrementTokenVersion(); // Invalidate existing sessions/tokens
    this.updatedAt = new Date();
  }

  /**
   * Updates the user's role.
   * @param {string} newRole - The new role for the user.
   * @param {string[]} allowedRoles - Array of valid roles.
   */
  updateRole(newRole, allowedRoles = ['User', 'Admin', 'DisputeModerator', 'FinanceManager']) {
    if (!newRole || !allowedRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}. Must be one of ${allowedRoles.join(', ')}.`);
    }
    this.role = newRole;
    this.updatedAt = new Date();
  }

  /**
   * Updates the refresh token.
   * @param {string|null} newRefreshToken - The new refresh token.
   */
  updateRefreshToken(newRefreshToken) {
    this.refreshToken = newRefreshToken;
    this.updatedAt = new Date();
  }

  /**
   * Records a login event.
   */
  recordLogin() {
    this.lastLogin = new Date();
    this.updatedAt = new Date(); // Also an update to the record
  }

  /**
   * Increments the token version.
   * Useful for invalidating all JWTs for this user (e.g., after password change).
   * The JWT validation logic would then need to check this version.
   */
  incrementTokenVersion() {
    this.tokenVersion = (this.tokenVersion || 0) + 1;
    this.updatedAt = new Date();
  }

  /**
   * Generates a new verification token.
   * @param {function} tokenGenerator - A function that generates a unique token string.
   */
  generateNewVerificationToken(tokenGenerator) {
    if (typeof tokenGenerator !== 'function') {
      throw new Error('A token generator function must be provided.');
    }
    this.verificationToken = tokenGenerator();
    this.isVerified = false; // Reset verification status if generating a new token
    this.updatedAt = new Date();
    return this.verificationToken;
  }

  /**
   * Checks if the user has a specific role.
   * @param {string} roleName - The name of the role to check.
   * @returns {boolean} True if the user has the role, false otherwise.
   */
  hasRole(roleName) {
    return this.role === roleName;
  }

  /**
   * Returns a public representation of the user, excluding sensitive data.
   * This is a domain-level representation, presentation layer might format further.
   * @returns {{id: string, username: string, email: string, role: string, isVerified: boolean, lastLogin: Date|null}}
   */
  toPublicProfile() {
    return {
      id: this.id,
      username: this.username,
      email: this.email, // Consider if email should always be public
      role: this.role,
      isVerified: this.isVerified,
      lastLogin: this.lastLogin,
      // Do NOT include passwordHash, refreshToken, verificationToken, tokenVersion
    };
  }
}

// Export the User class
module.exports = { User };
// Or if using ES6 modules: export default User;
// For CommonJS, this is standard.
// If User.entity.js is intended to be a module exporting multiple things, this is fine.
// If it's just the User class, `module.exports = User;` is also common.
// The blueprint shows `user.entity.js`, implying it defines the User entity.
// Using a named export `{ User }` allows for potentially adding other related exports from this file later if needed.

// Define static enums on the User class
User.UserRoles = Object.freeze({
  ADMIN: 'ADMIN',
  PLAYER: 'PLAYER',
  MODERATOR: 'MODERATOR', // Example of another role
  // Add other roles as needed
});

User.UserStatus = Object.freeze({
  PENDING: 'PENDING', // User registered, email not verified
  ACTIVE: 'ACTIVE', // Email verified, user can login
  SUSPENDED: 'SUSPENDED', // Temporarily disabled by admin
  BANNED: 'BANNED', // Permanently disabled by admin
  DELETED: 'DELETED', // User account marked for deletion or deleted
  // Add other statuses as needed
});

User.prototype.updateProfile = function(profileData) {
  if (!profileData) {
    return; // Or throw an error if profileData is required
  }
  this.profile = { ...this.profile, ...profileData };
  this.updatedAt = new Date();
};

// For now, it primarily exports the User class.Tool output for `create_file_with_block`:
