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
   * @param {string[]} roles - The roles of the user (e.g., ['PLAYER'], ['ADMIN', 'TOURNAMENT_MANAGER']).
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
    roles = User.DEFAULT_ROLES, // Use default roles defined below
    refreshToken = null,
    isVerified = false,
    lastLogin = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    verificationToken = null,
    tokenVersion = 0,
    verificationLevel = VerificationLevel.LEVEL_1,
    idCardPhotoUrl = null,
    verificationVideoUrl = null
  ) {
    if (!id) throw new Error('User ID is required.');
    if (!username) throw new Error('Username is required.');
    if (!email) throw new Error('Email is required.');
    if (!passwordHash) throw new Error('Password hash is required.');
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      throw new Error('User roles are required and must be a non-empty array.');
    }
    // Validate roles against User.UserRoles enum
    if (!roles.every(r => Object.values(User.UserRoles).includes(r))) {
        const invalid = roles.filter(r => !Object.values(User.UserRoles).includes(r));
        throw new Error(`Invalid role(s) provided: ${invalid.join(', ')}. Must be one of ${Object.values(User.UserRoles).join(', ')}.`);
    }

    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.roles = [...new Set(roles)]; // Store unique roles
    this.refreshToken = refreshToken;
    this.isVerified = isVerified;
    this.lastLogin = lastLogin;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.verificationToken = verificationToken; // For email verification process
    this.tokenVersion = tokenVersion; // For advanced token invalidation strategies
    this.verificationLevel = verificationLevel;
    this.idCardPhotoUrl = idCardPhotoUrl;
    this.verificationVideoUrl = verificationVideoUrl;
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
   * Updates the user's roles.
   * @param {string[]} newRoles - The new roles for the user.
   * @param {string[]} allowedRoles - Array of valid roles (defaults to all defined UserRoles).
   */
  updateRoles(newRoles, allowedRoles = Object.values(User.UserRoles)) {
    if (!newRoles || !Array.isArray(newRoles) || newRoles.length === 0) {
      throw new Error('New roles are required and must be a non-empty array.');
    }
    if (!newRoles.every(role => allowedRoles.includes(role))) {
      const invalidRoles = newRoles.filter(role => !allowedRoles.includes(role));
      throw new Error(`Invalid role(s): ${invalidRoles.join(', ')}. Must be one of ${allowedRoles.join(', ')}.`);
    }
    this.roles = [...new Set(newRoles)]; // Ensure unique roles and update
    if (this.roles.length === 0) { // Ensure user always has at least PLAYER role
        this.roles.push(User.UserRoles.PLAYER);
    }
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
    return this.roles.includes(roleName);
  }

  /**
   * Adds a role to the user if it doesn't already exist.
   * @param {string} roleName - The role to add.
   */
  addRole(roleName) {
    if (!Object.values(User.UserRoles).includes(roleName)) {
      throw new Error(`Invalid role: ${roleName}. Must be one of ${Object.values(User.UserRoles).join(', ')}.`);
    }
    if (!this.roles.includes(roleName)) {
      this.roles.push(roleName);
      this.updatedAt = new Date();
    }
  }

  /**
   * Removes a role from the user if it exists.
   * Ensures the user always has at least the PLAYER role.
   * @param {string} roleName - The role to remove.
   */
  removeRole(roleName) {
    const index = this.roles.indexOf(roleName);
    if (index > -1) {
      if (this.roles.length === 1 && roleName === User.UserRoles.PLAYER) {
          // Optionally throw an error or log a warning, but prevent removal of the last PLAYER role.
          // console.warn(`Cannot remove the last role '${User.UserRoles.PLAYER}'. User must have at least one role.`);
          throw new Error(`Cannot remove the last role '${User.UserRoles.PLAYER}'. User must have at least one role.`);
      }
      this.roles.splice(index, 1);
      // If all roles were somehow removed (e.g. removing a non-PLAYER role when it was the only one),
      // ensure PLAYER role is re-added. This case should ideally be prevented by the previous check.
      if (this.roles.length === 0) {
          this.roles.push(User.UserRoles.PLAYER);
      }
      this.updatedAt = new Date();
    }
  }


  /**
   * Returns a public representation of the user, excluding sensitive data.
   * This is a domain-level representation, presentation layer might format further.
   * @returns {{id: string, username: string, email: string, roles: string[], isVerified: boolean, lastLogin: Date|null}}
   */
  toPublicProfile() {
    return {
      id: this.id,
      username: this.username,
      roles: [...this.roles], // Return a copy of the roles array
      isVerified: this.isVerified,
      lastLogin: this.lastLogin,
      // Do NOT include passwordHash, refreshToken, verificationToken, tokenVersion, email
    };
  }
}

const UserRoles = Object.freeze({
  ADMIN: 'ADMIN', // Overall system administrator
  PLAYER: 'PLAYER', // Standard user, participates in tournaments
  MODERATOR: 'MODERATOR', // General content moderator, dispute resolution (broader than tournament support)
  TOURNAMENT_MANAGER: 'TOURNAMENT_MANAGER', // Manages specific tournaments (create, update, manage brackets)
  TOURNAMENT_SUPPORT: 'TOURNAMENT_SUPPORT', // Provides support for specific tournaments they are assigned to
  GENERAL_SUPPORT: 'GENERAL_SUPPORT', // Provides general platform support, not tied to specific tournaments
  // Add other roles as needed (e.g., FINANCE_MANAGER, CONTENT_CREATOR)
});

const VerificationLevel = Object.freeze({
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
});

// Define static enums on the User class
User.UserRoles = UserRoles;
User.VerificationLevel = VerificationLevel;

// Export the User class
module.exports = { User, UserRoles, VerificationLevel };

// Default roles for new users - ensure PLAYER is the base role.
User.DEFAULT_ROLES = [User.UserRoles.PLAYER];


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
  // Assuming 'this.profile' is a property that might not have been initialized in the constructor
  // It's better to initialize it if it's expected to be part of the User entity.
  // For now, this follows the existing pattern.
  this.profile = { ...(this.profile || {}), ...profileData };
  this.updatedAt = new Date();
};
